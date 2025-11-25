import { google } from "googleapis";
import env from "../config/env.js";

// creates a google oauth2 client instance
export function getClient(req) {
    const client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
    );

    // if session tokens exist, apply them to the client
    if (req && req.session && req.session.tokens) {
        client.setCredentials(req.session.tokens);
    }

    return client;
}