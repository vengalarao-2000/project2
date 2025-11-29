//Deletes the images in Section-1, 2 (Unprocessed and In progress) as we are not allowed to store the images permanently
//Only cropped images are stored in DB.

import express from "express";
// 1. Import 'bucket' to access Cloud Storage
import { admin, db, bucket } from "../services/firebase.js";
import { requireFirebaseUser } from "../middleware/auth.js";
import { EVENTS, trackServerEvent } from "../services/analytics.js";

const router = express.Router();

// POST /api/session/draft
//Handles both local uploads (base64 to storage) and Google Photos picks (just save metadata to Firestore)
router.post("/api/session/draft", requireFirebaseUser, async (req, res) => {
    const startTime = Date.now();
    const { uid } = req.user;
    const { items, source } = req.body; //source can be 'google-picker' or 'local'

    console.log("[session routes] draft request received.");
    console.log(`[session routes] source: ${source}, items count: ${items?.length}`);

    if (!items || !Array.isArray(items)) {
        // Track error
        await trackServerEvent(uid, EVENTS.API_ERROR, {
            endpoint: "/api/session/draft",
            error_message: "Invalid items payload"
        });
        return res.status(400).json({ error: "Invalid items" });
    }

    try {
        const batch = db.batch();

        // Prepare items for processing
        const processedItems = await Promise.all(items.map(async (item) => {
            // Generate a unique doc ID for Firestore doc using current timestamp + random string
            const docId = item.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            // Handle Google Photos (baseUrl) vs Local (url) ---
            // Google Photos sends 'baseUrl'. Local might send 'url'.
            // We must check both to ensure this is never undefined.
            let storageUrl = item.url || item.baseUrl;
            let storagePath = null;

            // If local upload with base64 data, upload to Cloud Storage
            if (source === "local" && item.base64) {
                console.log(`[session routes] uploading local file: ${item.filename}`);

                // Convert Base64 to Buffer
                // strip prefix if exists
                const buffer = Buffer.from(item.base64.split(';base64,').pop(), 'base64');
                const fileName = `users/${uid}/raw_uploads/${docId}.jpg`;
                const file = bucket.file(fileName);

                // Upload file to cloud storage
                await file.save(buffer, {
                    metadata: { contentType: item.mimeType || "image/jpeg" }
                });
                await file.makePublic();

                storageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                storagePath = fileName;
            }

            return {
                ...item, //Preserve original properties (baseUrl, mimeType)
                id: docId,
                source: source,
                url: storageUrl, //Google URL or Firebase Storage URL for direct upload
                storagePath: storagePath, // Google: null  | Local: 'users/...'
                filename: item.filename || "upload.jpg",
                status: 'picked',
                base64: null, // Ensure we don't save raw data to DB
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
        }));

        // Save metadata to Firestore i.e session_tems for section-1,2
        console.log("[session routes] saving drafts to firestore...");
        processedItems.forEach(item => {
            // Final sanity check to prevent crash if URL is still missing
            if (item.url === undefined) {
                console.warn(`Skipping item ${item.id} due to missing URL`);
                return;
            }

            const docRef = db.doc(`users/${uid}/session_items/${item.id}`);
            batch.set(docRef, item);
        });

        await batch.commit();
        console.log("[session routes] drafts saved successfully.");

        // Track Success: Session Draft Created
        // If source is 'local', this tracks a "Direct Upload" event
        // If source is 'google-picker', this tracks a "Google Photos Import" event
        await trackServerEvent(uid, "api_session_draft_saved", {
            source: source,
            item_count: items.length,
            duration_ms: Date.now() - startTime
        });

        res.json({ success: true, count: items.length });

    } catch (e) {
        console.error("Failed to save drafts:", e);
        // Track error
        await trackServerEvent(uid, EVENTS.API_ERROR, {
            endpoint: "/api/session/draft",
            error_message: e.message
        });
        res.status(500).json({ error: e.message });
    }
});


// 2. DELETE /api/session/clear
// Clears DB docs AND deletes associated Storage files for Google Photos picks
router.delete("/api/session/clear", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    console.log(`[session routes] clear session request for user: ${uid}`);

    try {
        // 1. Get all session items
        const snapshot = await db.collection(`users/${uid}/session_items`).get();

        if (snapshot.empty) {
            console.log("[session routes] no session items found.");
            return res.json({ success: true, deleted: 0 });
        }

        const fileDeletionPromises = [];
        const batch = db.batch();

        // 2. Loop through each item to find files that need deleting
        for (const doc of snapshot.docs) {
            const data = doc.data();

            // protect local uploads from deletion when user logs out
            // if the item is a local upload, skip deletion.
            // it will remain in section 1 or 2 of the dashboard.
            if (data.source === 'local') {
                continue;
            }

            // A. Check for 'renditions' of (Items in "Review/In Progress" stage)
            if (data.renditions) {
                Object.values(data.renditions).forEach(url => {
                    const filePath = getFilePathFromUrl(url, bucket.name);
                    if (filePath) {
                        // Delete file, catch error so one missing file doesn't break the whole loop
                        fileDeletionPromises.push(
                            bucket.file(filePath).delete().catch(err =>
                                console.warn(`Failed to delete file ${filePath}:`, err.message)
                            )
                        );
                    }
                });
            }

            // B. Check if there was a main 'storageUrl'
            if (data.storageUrl) {
                const filePath = getFilePathFromUrl(data.storageUrl, bucket.name);
                if (filePath) {
                    fileDeletionPromises.push(
                        bucket.file(filePath).delete().catch(err => console.warn(err.message))
                    );
                }
            }

            // 3. Mark Firestore doc for deletion
            batch.delete(doc.ref);
        }

        // 4. Execute all deletions (Files + DB)
        await Promise.all(fileDeletionPromises);
        await batch.commit();

        console.log(`[session routes] Cleared ${snapshot.size} session items and associated files for user ${uid}`);
        // Track Success: Session Cleared (Logout)
        await trackServerEvent(uid, "api_session_cleared", {
            items_deleted: snapshot.size
        });

        res.json({ success: true, deleted: snapshot.size });

    } catch (e) {
        console.error("[session routes] Failed to clear session:", e);
        //track error
        await trackServerEvent(uid, EVENTS.API_ERROR, {
            endpoint: "/api/session/clear",
            error_message: e.message
        });
        res.status(500).json({ error: "Failed to clear session" });
    }
});


// Helper: Extracts "users/uid/file.jpg" from the long public URL
function getFilePathFromUrl(url, bucketName) {
    try {
        // Public URL format: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
        if (url.includes(bucketName)) {
            const parts = url.split(`${bucketName}/`);
            if (parts.length > 1) {
                return decodeURIComponent(parts[1]);
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default router;