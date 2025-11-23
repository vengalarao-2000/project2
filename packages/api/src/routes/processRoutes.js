import express from "express";
import { getClient } from "../services/googleAuth.js";
import { admin, db, bucket } from "../services/firebase.js";
import { requireGoogle, requireFirebaseUser } from "../middleware/auth.js";
import { detectPetBoundingBox, downloadBytes, analyzeImageLabels, generateEnrichedMetadata } from "../services/ai.js";
import { generateSmartCrops } from "../services/imageProcessor.js";

const router = express.Router();


// 1. POST /api/analyze (Step 1: Unprocessed -> In Progress)
// Performs AI and Cropping, saves results to temporary session doc.
router.post("/api/analyze", requireGoogle, requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { itemIds, petName, prompt } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) return res.status(400).json({ error: "no_items" });

    // 1. Fetch items from session & mark as analyzing
    const itemsToProcess = [];
    for (const id of itemIds) {
        const docRef = db.doc(`users/${uid}/session_items/${id}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ status: 'analyzing' });
            itemsToProcess.push(docSnap.data());
        }
    }

    const processedIds = [];

    // 2. Process each item
    for (const it of itemsToProcess) {
        try {
            let imgBytes;

            // A. Get Image Bytes (Fix for "INVALID_ARGUMENT")
            if (it.source === "local" || it.source === "local-upload") {
                // CASE: Local Upload
                // Robustly handle base64 string (with or without prefix)
                const base64Data = it.base64 || (it.url && it.url.startsWith('data:') ? it.url : null);

                if (!base64Data) throw new Error("Missing data for local image");

                const base64String = base64Data.includes(';base64,')
                    ? base64Data.split(';base64,').pop()
                    : base64Data;

                imgBytes = Buffer.from(base64String, 'base64');

            } else {
                // CASE: Google Photos
                // We must get the access token explicitly to download the file
                const client = getClient(req);
                const { token: accessToken } = await client.getAccessToken();

                if (!it.baseUrl) throw new Error("Missing baseUrl for Google Photo");

                imgBytes = await downloadBytes(accessToken, it.baseUrl);
            }

            // SAFETY CHECK: Ensure we actually have data before calling Vision API
            if (!imgBytes || imgBytes.length === 0) {
                throw new Error("Failed to retrieve image data (empty buffer)");
            }
            // ---------------------------------------------------------

            // B. AI & Cropping
            // 1. Vision API (Labels)
            const labels = await analyzeImageLabels(imgBytes);
            const topLabels = labels.slice(0, 8);

            // 2. Gemini API (Caption/Moods)
            const aiData = await generateEnrichedMetadata(petName, prompt, topLabels);

            // 3. Smart Cropping (Generate 4 versions)
            const centerPoint = await detectPetBoundingBox(imgBytes);
            const croppedBuffersMap = await generateSmartCrops(imgBytes, centerPoint);

            // C. Upload ALL 4 Crops to Storage (Temporary/Session Storage)
            const renditions = {};

            for (const [variant, buffer] of Object.entries(croppedBuffersMap)) {
                // e.g., users/uid/fileName_square.jpg
                const fileName = `users/${uid}/temp_${it.id}_${variant}.jpg`;
                const file = bucket.file(fileName);

                await file.save(buffer, { metadata: { contentType: "image/jpeg" } });
                await file.makePublic();

                renditions[variant] = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            }

            // D. Update the SESSION Document
            // This keeps the item in the "In Progress" section but enables the "Select Crop" UI
            await db.doc(`users/${uid}/session_items/${it.id}`).update({
                status: 'ready_for_selection', // <--- UI listens for this to show results
                renditions: renditions,
                aiData: {
                    caption: aiData.caption,
                    labels: topLabels,
                    moods: aiData.moods
                },
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            processedIds.push(it.id);

        } catch (e) {
            console.error(`Analysis failed for item ${it.id}:`, e);
            await db.doc(`users/${uid}/session_items/${it.id}`).update({ status: 'error', error: e.message });
        }
    }

    res.json({ success: true, processedIds });
});

// ------------------------------------------------------------------
// 2. POST /api/finalize (Step 2: In Progress -> Generated Results)
// User picked a crop. Move from Session Storage -> Permanent Photos.
// ------------------------------------------------------------------
router.post("/api/finalize", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { sessionId, selectedCrop } = req.body; // e.g., 'square', 'portrait'

    if (!sessionId || !selectedCrop) return res.status(400).json({ error: "Missing data" });

    try {
        const sessionRef = db.doc(`users/${uid}/session_items/${sessionId}`);
        const docSnap = await sessionRef.get();

        if (!docSnap.exists) return res.status(404).json({ error: "Item not found" });

        const data = docSnap.data();

        // Get the URL of the selected crop
        const finalUrl = data.renditions[selectedCrop];

        // Save to PERMANENT collection
        await db.doc(`users/${uid}/photos/${sessionId}`).set({
            mediaItemId: data.id,
            filename: data.filename,
            storageUrl: finalUrl, // The chosen crop is now the main URL
            originalRenditions: data.renditions, // Keep others just in case

            caption: data.aiData.caption,
            labels: data.aiData.labels,
            moods: data.aiData.moods,

            selectedCropType: selectedCrop,
            source: data.source,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // DELETE from Session (Removes from middle section)
        await sessionRef.delete();

        res.json({ success: true });

    } catch (e) {
        console.error("Finalize failed", e);
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------------
// 3. GET History (Same as before)
// ------------------------------------------------------------------
router.get("/api/processed", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const snapshot = await db.collection(`users/${uid}/photos`).orderBy("processedAt", "desc").limit(50).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data(), url: d.data().storageUrl }));
    res.json({ items });
});

export default router;