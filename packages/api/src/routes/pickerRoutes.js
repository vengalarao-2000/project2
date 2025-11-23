import express from "express";
import { getClient } from "../services/googleAuth.js";
import { requireGoogle } from "../middleware/auth.js";

const router = express.Router();

// initiate picker session
router.get("/api/picker/create-session", requireGoogle, async (req, res) => {
    const client = getClient(req);
    const { token } = await client.getAccessToken();

    try {
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

        res.json({ pickerUri: session.pickerUri, sessionId: session.id });
    } catch (e) {
        console.error("picker session creation failed", e);
        res.status(500).json({ error: e.message });
    }
});

// check session status
router.get("/api/picker/poll-session", requireGoogle, async (req, res) => {
    const { sessionId } = req.query;
    const client = getClient(req);
    const { token } = await client.getAccessToken();

    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    try {
        // check status
        const r = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        // if ready, fetch items
        if (data.mediaItemsSet === true) {
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
            return res.json({ status: "complete", items });
        }
        res.json({ status: "polling" });
    } catch (e) {
        console.error("polling failed", e);
        res.status(500).json({ error: e.message });
    }
});

// proxy secure images for display
router.get("/api/proxy-image", requireGoogle, async (req, res) => {
    const { url } = req.query;
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
        console.error("image proxy error", e);
        res.status(500).send("Failed to load image");
    }
});

export default router;