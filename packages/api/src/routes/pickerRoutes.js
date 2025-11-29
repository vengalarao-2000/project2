import express from "express";
import { getClient } from "../services/googleAuth.js";
import { requireGoogle, requireFirebaseUser } from "../middleware/auth.js";
import { EVENTS, trackServerEvent } from "../services/analytics.js";
import { logToCloud } from "../services/logger.js";

const router = express.Router();

// initiate picker session
//creates a session with google photos api and returns the pickerUri and sessionId to the client
router.get("/api/picker/create-session", requireGoogle, requireFirebaseUser, async (req, res) => {
    const trackingId = "picker_user";
    console.log("[picker routes] create-session request received.");
    const client = getClient(req);
    const { token } = await client.getAccessToken();

    try {
        // call google photos picker api to create a new session
        console.log("[picker routes] calling google photos api to create session...");
        const response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

        if (!response.ok) throw new Error(await response.text());
        const session = await response.json();

        console.log(`[picker routes] session created successfully. id: ${session.id}`);

        // Log Success
        await logToCloud("Picker session created", "INFO", {
            uid: req.user.uid,
            message: "Picker session created successfully",
        });

        // Track Success: Picker Session Created
        // This tells us how many times users intended to pick photos
        await trackServerEvent(trackingId, EVENTS.PICKER_SESSION_CREATED, {
            session_id: session.id
        });

        res.json({ pickerUri: session.pickerUri, sessionId: session.id });
    } catch (e) {
        console.error("[picker routes] picker session creation failed:", e);
        await logToCloud("Picker session failed", "ERROR", {
            uid: req.user.uid,
            message: "Picker session creation failed: " + e.message,
        });
        // Track Error
        await trackServerEvent(trackingId, EVENTS.API_ERROR, {
            endpoint: "/api/picker/create-session",
            error_message: e.message
        });
        res.status(500).json({ error: e.message });
    }
});

// check session status
// polls the google photos api to see if the user has finished selecting photos
router.get("/api/picker/poll-session", requireGoogle, requireFirebaseUser, async (req, res) => {
    const { sessionId } = req.query;
    console.log(`[picker routes] poll-session request for session id: ${sessionId}`);

    const client = getClient(req);
    const { token } = await client.getAccessToken();

    if (!sessionId) {
        console.warn("[picker routes] missing sessionid in request.");
        return res.status(400).json({ error: "Missing sessionId" });
    }

    try {
        // check status of the session
        const r = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        // if mediaItemsSet is true, the user has finished selection
        if (data.mediaItemsSet === true) {
            console.log("[picker routes] session complete. fetching selected items...");
            const listUrl = `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100`;
            const itemsReq = await fetch(listUrl, { headers: { "Authorization": `Bearer ${token}` } });
            const itemsData = await itemsReq.json();

            const items = (itemsData.mediaItems || []).map(mi => ({
                id: mi.id,
                filename: mi.mediaFile.filename,
                baseUrl: mi.mediaFile.baseUrl,
                thumbUrl: `${mi.mediaFile.baseUrl}=w500-h500`,
                mimeType: mi.mediaFile.mimeType
            }));

            console.log(`[picker routes] retrieved ${items.length} items.`);

            await logToCloud("Polling images complete", "INFO", {
                uid: req.user.uid,
                message: "Polling completed and items retrieved",
                itemCount: items.length,
            });
            // Track Completion: Picker Selection Complete
            await trackServerEvent(req.user.uid, "api_picker_selection_complete", {
                item_count: items.length,
                session_id: sessionId
            });
            return res.json({ status: "complete", items });
        }

        console.log("[picker routes] session still active (polling).");
        res.json({ status: "polling" });
    } catch (e) {
        console.error("[picker routes] polling failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// proxy secure images for display
// fetches images from google photos on behalf of the client to avoid cors/auth issues
router.get("/api/proxy-image", requireGoogle, async (req, res) => {
    const { url } = req.query;
    // console.log(`[picker routes] proxy-image request for url: ${url}`);

    if (!url) return res.status(400).send("Missing url");

    try {
        const client = getClient(req);
        const { token } = await client.getAccessToken();

        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);

        res.setHeader("Content-Type", response.headers.get("content-type"));
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        console.error("[picker routes] image proxy error:", e);
        res.status(500).send("Failed to load image");
    }
});

export default router;