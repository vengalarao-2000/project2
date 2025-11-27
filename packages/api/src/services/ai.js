import vision from "@google-cloud/vision";
import { VertexAI } from "@google-cloud/vertexai";
import env from "../config/env.js";
import sharp from 'sharp';

// initialize clients with specific project id to avoid ghost project issues
const visionClient = new vision.ImageAnnotatorClient({
    projectId: env.FIREBASE_PROJECT_ID
});

const vertex = new VertexAI({
    project: env.FIREBASE_PROJECT_ID,
    location: env.VERTEX_LOCATION
});

const genModel = vertex.getGenerativeModel({ model: env.VERTEX_MODEL });

// Find the pet's bounding box
//Cropping will be made based on pet itself if both owner and pet are present
export async function detectPetBoundingBox(imgBytes) {
    const client = new vision.ImageAnnotatorClient();
    // Use OBJECT_LOCALIZATION to get coordinates
    const [result] = await client.objectLocalization({
        image: { content: imgBytes },
    });

    const objects = result.localizedObjectAnnotations || [];

    // 1. Define Priority Lists
    // Specific pets we want to focus on first
    const SPECIFIC_PETS = [
        "Dog", "Cat", "Puppy", "Kitten", "Rabbit", "Hamster", "Guinea pig",
        "Bird", "Parrot", "Owl", "Fish", "Goldfish", "Turtle", "Tortoise",
        "Horse", "Pony", "Ferret", "Chinchilla", "Gerbil"
    ];

    // Generic fallbacks if the API isn't sure
    const GENERIC_ANIMALS = ["Animal", "Mammal", "Vertebrate"];

    // The Owner (fallback if no pet detected, or for selfies)
    const HUMANS = ["Person", "Man", "Woman", "Girl", "Boy"];

    // 2. Find the Target
    // We search in order: Specific Pet -> Generic Animal -> Human
    let target = objects.find(obj => SPECIFIC_PETS.includes(obj.name));

    if (!target) {
        target = objects.find(obj => GENERIC_ANIMALS.includes(obj.name));
    }

    if (!target) {
        // If no animal found, center on the owner so we don't crop out the main subject
        target = objects.find(obj => HUMANS.includes(obj.name));
    }

    // 3. Handle Result
    if (!target || !target.boundingPoly) {
        console.log("No pet or person bounding box found, defaulting to center.");
        return null;
    }

    console.log(`Smart Crop Focusing on: ${target.name}`);

    // Vision API returns normalized vertices (0.0 to 1.0).
    // We need to calculate the center point of the box.
    const vertices = target.boundingPoly.normalizedVertices;
    const minX = Math.min(...vertices.map(v => v.x));
    const maxX = Math.max(...vertices.map(v => v.x));
    const minY = Math.min(...vertices.map(v => v.y));
    const maxY = Math.max(...vertices.map(v => v.y));

    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    // Return normalized center point (e.g., x: 0.5, y: 0.5 is dead center)
    return { x: centerX, y: centerY };
}

// helper to download image bytes from google photos
export async function downloadBytes(accessToken, baseUrl) {
    // fetch the raw bytes using the download parameter (=d)
    const r = await fetch(`${baseUrl}=d`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!r.ok) throw new Error(`download failed ${r.status}`);
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
}

// analyzes image labels using google cloud vision and performs safe search filtering
export async function analyzeImageLabels(imgBytes) {
    const [result] = await visionClient.annotateImage({
        image: { content: imgBytes },
        features: [{ type: "LABEL_DETECTION", maxResults: 15 }, { type: "SAFE_SEARCH_DETECTION" }],
    });

    const safeSearch = result.safeSearchAnnotation;
    //Vision API returns likelihood as strings: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
    const FORBIDDEEN_LEVELS = ["LIKELY", "VERY_LIKELY"];
    if (safeSearch) {
        //Check for the below categories
        const isAdult = FORBIDDEEN_LEVELS.includes(safeSearch.adult);
        const isViolent = FORBIDDEEN_LEVELS.includes(safeSearch.violence);
        const isRacy = FORBIDDEEN_LEVELS.includes(safeSearch.racy);
        if (isAdult || isViolent || isRacy) {
            // Throwing an error here will stop the processing loop in your routes
            throw new Error(`Image blocked by SafeSearch: Adult(${safeSearch.adult}), Violence(${safeSearch.violence})`);
        }
    }

    // filter for high confidence results
    return (result.labelAnnotations || [])
        .filter(l => (l.score || 0) >= 0.6)
        .map(l => l.description.toLowerCase());
}

// generates caption using gemini based on labels
export async function generateEnrichedMetadata(petName, prompt, labels) {
    const userPrompt = `
        Analyze these image labels: ${labels.join(", ")}.
        
        1. Write a short (<=18 words) friendly social media caption.
           Pet Name: ${petName || "my pet"}. 
           User Context: ${prompt || "None"}.
        2. Generate exactly 5 single-word adjectives/moods describing the vibe (e.g., "Whimsical", "Energetic", "Cozy").
        3. Write a creative and engaging narrative description (approx. 30-40 words or 3-4 sentences). 
           Tell a mini-story about the moment captured in the image based on the visual cues and labels.

        Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
            "caption": "string",
            "moods": ["string", "string", "string", "string", "string"],
            "narrative": "string"
        }
    `;

    try {
        const result = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        });

        const textResponse = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Clean up markdown if Gemini adds it
        const cleanJson = textResponse.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini generation failed", e);
        return {
            caption: "A lovely moment captured in time.",
            moods: ["happy", "memorable", "cute", "sweet", "lovely"],
            narrative: "We captured a beautiful memory today. The lighting was perfect and the mood was just right. It's moments like these that we want to cherish forever, looking back at the simple joys of life with our furry friends."
        };
    }
}

// Function to refine caption/narrative based on user input
export async function refineText(currentCaption, userInstruction) {
    console.log("Current Caption:", currentCaption);
    console.log("Refining text with instruction:", userInstruction);
    const prompt = `
        Current Caption: "${currentCaption}"
        User Instruction: "${userInstruction}"
        
        Task: Update the caption and narrative based strictly on the User Instruction.
        
        Constraints:
        1. The Narrative must be approx 30-40 words (3-4 sentences).
        2. Maintain the vibe requested in the instruction.
        3. CRITICAL: If the User Instruction implies keeping the caption the same (e.g. "don't change caption", "only update narrative"), you MUST return the "Current Caption" text exactly as is and only change narrative.
        4. If the instruction is vague, improve both.

        IMPORTANT: Return ONLY a raw JSON object. Do not use Markdown code blocks.
        Format: { "caption": "string", "narrative": "string" }
    `;

    try {
        const resp = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const textResponse = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // 1. Clean up markdown
        const cleanJson = textResponse.replace(/```json|```/g, '').trim();

        // 2. CRITICAL FIX: Parse the string into a JavaScript Object
        return JSON.parse(cleanJson);

    } catch (e) {
        console.error("Failed to get refined caption from Gemini", e);
        // Return fallback structure matching success shape
        return {
            caption: currentCaption || "A lovely moment captured in time.",
            narrative: "Could not generate narrative at this time."
        };
    }
}

//Fuse Image with Caption using Sharp and SVG overlay
// helper function to wrap text into multiple lines based on max characters
function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + 1 + words[i].length <= maxChars) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

// main function to fuse text onto an image buffer
export async function fuseTextOnImage(imgBuffer, text) {
    try {
        console.log("  [ai service] fusetextonimage (pure svg) started.");

        // 1. get image metadata
        const image = sharp(imgBuffer);
        // clone image to safely read metadata without affecting the pipeline
        const metadata = await image.clone().metadata();
        const width = metadata.width;
        const height = metadata.height;

        console.log(`  [ai service] dimensions: ${width}x${height}`);

        // 2. calculate dynamic dimensions based on image width
        // font size is set to 4% of the total image width
        const fontSize = Math.floor(width * 0.04);
        // line height is 1.2 times the font size for readability
        const lineHeight = Math.floor(fontSize * 1.2);
        // padding from the bottom of the image
        const bottomPadding = Math.floor(height * 0.05);

        // 3. wrap text logic
        // estimate maximum characters per line based on width and font size (heuristic)
        // conservative estimate: width / (fontSize * 0.6)
        const maxCharsPerLine = Math.floor(width / (fontSize * 0.6));
        const lines = wrapText(text, maxCharsPerLine);

        // calculate total height of the text block based on number of lines
        const textBlockHeight = lines.length * lineHeight;

        // calculate y-coordinate where the background bar starts
        // place it at the bottom with some extra padding for aesthetics
        const barHeight = textBlockHeight + (fontSize * 2);
        const barY = height - barHeight;

        // calculate y-coordinate for the first line of text
        // add one line height of padding inside the bar
        const textStartY = barY + lineHeight + (fontSize * 0.5);

        console.log(`  [ai service] text wrapped into ${lines.length} lines.`);

        // 4. construct pure svg string
        // generate <tspan> elements for multi-line text support inside svg
        const textSpans = lines.map((line, i) => {
            // x="50%" centers the text horizontally
            // dy (delta y) shifts each subsequent line down
            return `<tspan x="50%" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`;
        }).join('');

        // build the full svg with a shadow filter, background rect, and text
        const svgImage = `
        <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.7"/>
            </filter>
          </defs>
          
          <rect x="0" y="${barY}" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.6)" />
          
          <text 
            x="50%" 
            y="${textStartY}" 
            text-anchor="middle" 
            font-family="sans-serif" 
            font-weight="bold" 
            font-size="${fontSize}" 
            fill="white"
            filter="url(#shadow)"
          >
            ${textSpans}
          </text>
        </svg>
        `;

        // 5. composite layers
        // overlay the svg on top of the original image
        const outputBuffer = await image
            .composite([{ input: Buffer.from(svgImage) }])
            // force high-quality jpeg output
            .jpeg({
                quality: 95,
                chromaSubsampling: '4:4:4', // prevents color bleeding
                mozjpeg: true
            })
            .toBuffer();

        console.log("  [ai service] composition complete.");
        return outputBuffer;

    } catch (error) {
        console.error("  [ai service] error inside fusetextonimage:", error);
        throw error;
    }
}