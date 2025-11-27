import express from "express";
import { getClient } from "../services/googleAuth.js";
import env from "../config/env.js";

const router = express.Router();

// redirect user to google login page to start oauth flow
router.get("/auth/google", (req, res) => {
    const client = getClient(req);
    // generate the oauth url with required scopes
    const url = client.generateAuthUrl({
        //you'll get a refresh token for long term access
        access_type: "offline",
        //forces to show consent screen every time
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"
        ],
    });
    res.redirect(url);
});

// handles callback from google after user logs in
router.get("/oauth2callback", async (req, res) => {
    const client = getClient(req);
    try {
        //exchange the temporary code for access and refresh tokens
        const { tokens } = await client.getToken(req.query.code);

        //remove the large id_token to prevent cookie size limits
        //cookie-session has a 4kb limit and id_token often exceeds this limit
        if (tokens.id_token) delete tokens.id_token;

        //store tokens in the user's session cookie
        req.session.tokens = tokens;
        //redirect user to dashboard in frontend
        res.redirect(`${env.FRONTEND_ORIGIN}/dashboard`);
    } catch (e) {
        console.error("oauth callback error", e);
        res.status(500).send("Authentication failed");
    }
});

// destroys the user session to log them out
router.get("/logout", (req, res) => {
    req.session = null;
    res.status(200).send("Logged out");
});

//debugging endpoint to check if session exists
router.get("/api/debug/session", (req, res) => {
    res.json({ hasTokens: !!req.session.tokens });
});

export default router;