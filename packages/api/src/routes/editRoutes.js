import express from "express";
import { admin, bucket, db } from "../services/firebase.js";
import { requireFirebaseUser } from "../middleware/auth.js";
import { refineText, fuseTextOnImage } from "../services/ai.js";

const router = express.Router();


// 1. POST /api/refine-text
// Uses Gemini to rewrite caption & narrative based on user instruction
router.post("/api/refine-text", requireFirebaseUser, async (req, res) => {
    const { currentCaption, instruction } = req.body;

    if (!instruction) {
        return res.status(400).json({ error: "Instruction is required" });
    }

    try {
        // Call the helper function we created in ai.js
        const result = await refineText(currentCaption, instruction);
        res.json(result);
    } catch (e) {
        console.error("Refine text error:", e);
        res.status(500).json({ error: "Failed to refine text" });
    }
});


// 2. POST /api/fuse-image
// Generates a temporary preview of the image with text overlay.
// Returns a Base64 string so the frontend can display it immediately
// without filling up Firebase Storage with unused drafts.
router.post("/api/fuse-image", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { imageUrl, caption } = req.body;

    console.log("--- START FUSE REQUEST (PREVIEW) ---");
    console.log("User:", uid);
    console.log("Caption:", caption);

    // validate required inputs
    if (!imageUrl || !caption) {
        console.error("Missing parameters");
        return res.status(400).json({ error: "Missing image URL or caption" });
    }

    try {
        // A. Download source image from the provided URL
        // This is usually the cropped version currently stored in Firebase
        console.log("Step 1: Fetching image from URL...");
        const response = await fetch(imageUrl);

        if (!response.ok) {
            console.error(`Failed to fetch image. Status: ${response.status}`);
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Convert response to a Buffer for image processing
        const arrayBuffer = await response.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);
        console.log(`Step 1 Success: Image downloaded. Size: ${inputBuffer.length} bytes`);

        // B. Generate Fused Image using the AI Service
        // This applies the text overlay using Sharp/SVG
        console.log("Step 2: Calling fuseTextOnImage...");
        const fusedBuffer = await fuseTextOnImage(inputBuffer, caption);
        console.log(`Step 2 Success: Fused image created. Size: ${fusedBuffer.length} bytes`);

        // C. Convert Buffer to Base64 String
        // We do NOT upload to storage here. We send the data directly to the client.
        console.log("Step 3: Converting Buffer to Base64 string...");
        const base64Image = `data:image/jpeg;base64,${fusedBuffer.toString('base64')}`;
        console.log("Step 3 Success: Base64 string generated.");

        console.log("Step 4: Returning preview to client.");
        console.log("--- END FUSE REQUEST ---");

        // Return the Data URI directly to the frontend
        res.json({ fusedImage: base64Image });

    } catch (e) {
        console.error("!!! FUSE IMAGE ERROR !!!", e);
        res.status(500).json({ error: "Failed to generate fused image" });
    }
});


// 3. POST /api/save-refinements
// Saves the final caption, narrative, and uploads the fused image
// to permanent Cloud Storage only when the user clicks "Save".
router.post("/api/save-refinements", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { photoId, caption, narrative, fusedImageBase64 } = req.body;

    console.log("--- START SAVE REQUEST ---");
    console.log("Photo ID:", photoId);

    if (!photoId) {
        return res.status(400).json({ error: "Missing Photo ID" });
    }

    try {
        // Prepare the update object for Firestore
        const updates = {
            caption: caption,
            narrative: narrative,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Check if a new fused image was generated (it will be a long Base64 string)
        // If the user didn't change the image, this might be null or an existing URL
        if (fusedImageBase64 && fusedImageBase64.startsWith('data:image')) {
            console.log("Step 1: Processing new fused image upload...");

            // 1. Convert Base64 string back to binary Buffer
            // Remove the "data:image/jpeg;base64," prefix
            const base64Data = fusedImageBase64.split(';base64,').pop();
            const imgBuffer = Buffer.from(base64Data, 'base64');

            // 2. Define permanent storage path
            const timestamp = Date.now();
            const fileName = `users/${uid}/fused_${photoId}_${timestamp}.jpg`;
            const file = bucket.file(fileName);

            console.log(`Step 2: Uploading to Cloud Storage: ${fileName}`);

            // 3. Save file to bucket
            await file.save(imgBuffer, {
                metadata: { contentType: "image/jpeg" }
            });

            // 4. Make file public
            await file.makePublic();

            // 5. Construct public URL
            const fusedUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

            // Add the new URL to our Firestore update object
            updates.fusedUrl = fusedUrl;
            console.log("Step 3: Image uploaded successfully.");
        } else {
            console.log("No new image to upload (keeping existing image).");
        }

        // Update the document in the 'photos' collection
        console.log("Step 4: Updating Firestore document...");
        await db.doc(`users/${uid}/photos/${photoId}`).update(updates);

        console.log("--- END SAVE REQUEST ---");

        // Return the updated data (including new URL if generated) so frontend can update state
        res.json({ success: true, updatedData: updates });

    } catch (e) {
        console.error("Save refinements error:", e);
        res.status(500).json({ error: "Failed to save changes" });
    }
});
export default router;