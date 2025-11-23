import vision from "@google-cloud/vision";
import { VertexAI } from "@google-cloud/vertexai";
import env from "../config/env.js";

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
export async function detectPetBoundingBox(imgBytes) {
    const client = new vision.ImageAnnotatorClient();
    // Use OBJECT_LOCALIZATION to get coordinates
    const [result] = await client.objectLocalization({
        image: { content: imgBytes },
    });

    const objects = result.localizedObjectAnnotations;

    // Find the first object that is a "Dog" or "Cat"
    // You might want to expand this list or use your existing label analysis to define "pet"
    const petObject = objects.find(obj =>
        ["Dog", "Cat", "Puppy", "Kitten"].includes(obj.name)
    );

    if (!petObject || !petObject.boundingPoly) {
        // Fallback: If no pet detected, return center of image (null means default center crop)
        console.log("No pet bounding box found, defaulting to center.");
        return null;
    }

    // Vision API returns normalized vertices (0.0 to 1.0). 
    // We need to calculate the center point of the box.
    const vertices = petObject.boundingPoly.normalizedVertices;
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

// analyzes image labels using google cloud vision
export async function analyzeImageLabels(imgBytes) {
    const [result] = await visionClient.annotateImage({
        image: { content: imgBytes },
        features: [{ type: "LABEL_DETECTION", maxResults: 15 }, { type: "SAFE_SEARCH_DETECTION" }],
    });

    // filter for high confidence results
    return (result.labelAnnotations || [])
        .filter(l => (l.score || 0) >= 0.6)
        .map(l => l.description.toLowerCase());
}

// generates caption using gemini based on labels
export async function generateEnrichedMetadata(petName, prompt, labels) {
    // We ask Gemini for JSON output so we can get both caption and moods reliably
    const userPrompt = `
        Analyze these image labels: ${labels.join(", ")}.
        
        1. Write a short (<=18 words) friendly social media caption.
           Pet Name: ${petName || "my pet"}. 
           User Context: ${prompt || "None"}.
        2. Generate exactly 5 single-word adjectives/moods describing the vibe (e.g., "Whimsical", "Energetic", "Cozy").

        Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
            "caption": "string",
            "moods": ["string", "string", "string", "string", "string"]
        }
    `;

    try {
        const result = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        });

        const textResponse = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Clean up markdown if Gemini adds it (e.g., ```json ... ```)
        const cleanJson = textResponse.replace(/```json|```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini generation failed", e);
        // Fallback if AI fails
        return { caption: "A lovely moment captured in time.", moods: ["happy", "memorable"] };
    }
}