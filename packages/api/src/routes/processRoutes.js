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
    console.log("[process routes] analyze request received.");
    console.log(`[process routes] user: ${uid}, items: ${itemIds?.length}, prompt: "${prompt || 'none'}"`);

    if (!itemIds || !Array.isArray(itemIds)) return res.status(400).json({ error: "no_items" });

    // 1. Fetch items from session & mark as analyzing
    const itemsToProcess = [];
    console.log("[process routes] step 1: fetching session items...");

    for (const id of itemIds) {
        const docRef = db.doc(`users/${uid}/session_items/${id}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            await docRef.update({ status: 'analyzing' });
            itemsToProcess.push(docSnap.data());
        }
    }
    console.log(`[process routes] found ${itemsToProcess.length} items to analyze.`);
    const processedIds = [];

    // 2. Process each item
    for (const it of itemsToProcess) {
        console.log(`[process routes] processing item id: ${it.id}`);
        try {
            let imgBytes;

            // A. Get Image Bytes (Fix for "INVALID_ARGUMENT")
            if (it.source === "local" || it.source === "local-upload") {
                // CASE: Local Upload
                // Robustly handle base64 string (with or without prefix)
                console.log("[process routes] source is local upload.");
                //const base64Data = it.base64 || (it.url && it.url.startsWith('data:') ? it.url : null);

                // CASE 1: It's already in our Cloud Storage (from Step 1)
                if (it.url && it.url.startsWith("http")) {
                    const response = await fetch(it.url);
                    const arrayBuffer = await response.arrayBuffer();
                    imgBytes = Buffer.from(arrayBuffer);
                } else {
                    throw new Error("Invalid local image URL");
                }

            } else {
                // CASE: Google Photos
                // We must get the access token explicitly to download the file
                console.log("[process routes] source is google photos.");
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
            console.log(`[process routes] vision api returned ${labels.length} labels.`);
            const topLabels = labels.slice(0, 8);

            // 2. Gemini API (Caption/Moods)
            const aiData = await generateEnrichedMetadata(petName, prompt, topLabels);
            console.log("[process routes] gemini api returned caption and moods: ", aiData);

            // 3. Smart Cropping (Generate 4 versions)
            const centerPoint = await detectPetBoundingBox(imgBytes);
            console.log("[process routes] detected pet bounding box: ", centerPoint, " and generating smart crops...");
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
            console.log("[process routes] updating session document status to 'ready_for_selection'...");
            await db.doc(`users/${uid}/session_items/${it.id}`).update({
                status: 'ready_for_selection', //UI listens for this to show results
                renditions: renditions,
                aiData: {
                    caption: aiData.caption,
                    narrative: aiData.narrative,
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


// 2. POST /api/finalize (Step 2: In Progress -> Generated Results)
// User picked a crop. Move from Session Storage -> Permanent Photos.
router.post("/api/finalize", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { sessionId, selectedCrop } = req.body;

    console.log("[process routes] finalize request received.");
    console.log(`[process routes] session id: ${sessionId}, selected crop: ${selectedCrop}`);

    if (!sessionId || !selectedCrop) return res.status(400).json({ error: "Missing data" });

    try {
        const sessionRef = db.doc(`users/${uid}/session_items/${sessionId}`);
        const docSnap = await sessionRef.get();

        if (!docSnap.exists) {
            console.warn("[process routes] session item not found.");
            return res.status(404).json({ error: "Item not found" });
        }

        const data = docSnap.data();
        const finalUrl = data.renditions[selectedCrop];
        console.log(`[process routes] final url selected: ${finalUrl}`);

        // Save to PERMANENT collection
        console.log("[process routes] saving to permanent 'photos' collection...");
        await db.doc(`users/${uid}/photos/${sessionId}`).set({
            mediaItemId: data.id,
            filename: data.filename,
            storageUrl: finalUrl,
            originalRenditions: data.renditions,

            caption: data.aiData.caption,
            labels: data.aiData.labels,
            moods: data.aiData.moods,
            narrative: data.aiData.narrative,

            selectedCropType: selectedCrop,
            source: data.source,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Cleanup
        console.log("[process routes] deleting temporary session item...");
        await sessionRef.delete();

        res.json({ success: true });

    } catch (e) {
        console.error("[process routes] finalize failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// 3. GET /api/processed
// Fetches user's processed photo history (permanent photos)
router.get("/api/processed", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    console.log(`[process routes] fetching history for user: ${uid}`);

    try {
        const photosSnapshot = await db.collection(`users/${uid}/photos`)
            .orderBy("processedAt", "desc")
            .limit(50)
            .get();

        const items = photosSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure frontend has renditions object, even for old items
                renditions: data.renditions || { original: data.storageUrl },
                url: data.storageUrl || `${data.baseUrl}=w1600-h1600`
            };
        });

        console.log(`[process routes] returning ${items.length} history items.`);
        res.json({ items });
    } catch (e) {
        console.error("[process routes] failed to fetch history:", e);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;