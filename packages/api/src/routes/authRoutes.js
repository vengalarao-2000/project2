import express from "express";
import { getClient } from "../services/googleAuth.js";
import env from "../config/env.js";

const router = express.Router();

// redirect user to google login
router.get("/auth/google", (req, res) => {
    const client = getClient(req);
    const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
        ],
    });
    res.redirect(url);
});

// handle google callback and save tokens
router.get("/oauth2callback", async (req, res) => {
    const client = getClient(req);
    try {
        const { tokens } = await client.getToken(req.query.code);

        // remove id_token to keep cookie size small
        if (tokens.id_token) delete tokens.id_token;

        req.session.tokens = tokens;
        res.redirect(`${env.FRONTEND_ORIGIN}/dashboard`);
    } catch (e) {
        console.error("oauth callback error", e);
        res.status(500).send("Authentication failed");
    }
});

// clear session
router.get("/logout", (req, res) => {
    req.session = null;
    res.status(200).send("Logged out");
});

// debug endpoint
router.get("/api/debug/session", (req, res) => {
    res.json({ hasTokens: !!req.session.tokens });
});

export default router;