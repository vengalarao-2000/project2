//Proxy route for frontend to log frontend requests to cloud logging
import express from "express";
import { logToCloud } from "../services/logger.js";

const router = express.Router();

// POST /api/log
// Receives log data from frontend and forwards to Google Cloud Logging
router.post("/api/log", async (req, res) => {
    const { message, severity, data } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    // Forward the log to Google Cloud
    // We prefix the message with [Frontend] to easily distinguish it in the console
    await logToCloud(`[Frontend] ${message}`, severity || "INFO", {
        ...data,
        source: "client_browser" // Helpful metadata
    });

    res.status(200).send("Logged");
});

export default router;