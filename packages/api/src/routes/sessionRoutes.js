//Deletes the images in Section-1, 2 (Unprocessed and In progress) as we are not allowed to store the images permanently
//Only cropped images are stored in DB.

import express from "express";
// 1. Import 'bucket' to access Cloud Storage
import { admin, db, bucket } from "../services/firebase.js";
import { requireFirebaseUser } from "../middleware/auth.js";

const router = express.Router();

// POST /api/session/draft (Keep this exactly as it was)
router.post("/api/session/draft", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;
    const { items, source } = req.body;

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid items" });
    }

    try {
        const batch = db.batch();

        items.forEach(item => {
            const docId = item.id || item.mediaItemId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const docRef = db.doc(`users/${uid}/session_items/${docId}`);

            batch.set(docRef, {
                ...item,
                id: docId,
                source: source,
                status: 'picked',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        res.json({ success: true, count: items.length });

    } catch (e) {
        console.error("Failed to save draft items:", e);
        res.status(500).json({ error: e.message });
    }
});


// 2. DELETE /api/session/clear
// Clears DB docs AND deletes associated Storage files
router.delete("/api/session/clear", requireFirebaseUser, async (req, res) => {
    const { uid } = req.user;

    try {
        // 1. Get all session items
        const snapshot = await db.collection(`users/${uid}/session_items`).get();

        if (snapshot.empty) {
            return res.json({ success: true, deleted: 0 });
        }

        const fileDeletionPromises = [];
        const batch = db.batch();

        // 2. Loop through each item to find files that need deleting
        for (const doc of snapshot.docs) {
            const data = doc.data();

            // A. Check for 'renditions' (Items in "Review/In Progress" stage)
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

            // B. Check if there was a main 'storageUrl' (rare for session items in our new flow, but good for safety)
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

        console.log(`Cleared ${snapshot.size} session items and associated files for user ${uid}`);
        res.json({ success: true, deleted: snapshot.size });

    } catch (e) {
        console.error("Failed to clear session:", e);
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