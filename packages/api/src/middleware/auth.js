import { admin } from "../services/firebase.js";

// middleware to ensure user is logged in with google oauth
export const requireGoogle = (req, res, next) =>
    // check if session has google tokens
    req.session.tokens ? next() : res.status(401).json({ error: "not_authenticated_google" });

// middleware to verify firebase id token from headers
export async function requireFirebaseUser(req, res, next) {
    try {
        const hdr = req.headers.authorization || "";
        // extract token from "Bearer <token>" by removing "Bearer "
        const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

        if (!idToken) return res.status(401).json({ error: "no_firebase_token" });
        // verify token with firebase admin sdk and attach user info to req
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = { uid: decoded.uid, email: decoded.email || null };
        // proceed to next middleware/route handler
        next();
    } catch (e) {
        console.error("firebase token verification failed", e);
        res.status(401).json({ error: "invalid_firebase_token" });
    }
}