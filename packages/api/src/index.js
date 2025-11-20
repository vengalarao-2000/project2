// index.js (API)
// import express from "express";
// import cors from "cors";
// import { google } from "googleapis";
// import dotenv from "dotenv";

// // EITHER use env vars...
// dotenv.config();

// const app = express();
// app.use(cors({ origin: "http://localhost:5173", credentials: true })); // adjust to your front-end port
// app.use(express.json());

// // ---- If you use ENV (recommended) ----
// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";


// // Construct OAuth2 client with real values
// const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// // Request Photos scope
// const scopes = [
//     "https://www.googleapis.com/auth/photoslibrary",
//     "https://www.googleapis.com/auth/photoslibrary.readonly"
// ];

// app.get('/auth/google', (req, res) => {
//     const url = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: scopes,
//         prompt: 'consent',                 // force re-consent each time
//         include_granted_scopes: false,     // don't auto-merge older narrower grants
//     });
//     res.redirect(url);
// });

// app.get('/oauth2callback', async (req, res) => {
//     const { code } = req.query;
//     if (!code) return res.status(400).send('Missing code');

//     try {
//         const { tokens } = await oauth2Client.getToken(code);
//         oauth2Client.setCredentials(tokens);

//         const accessToken = tokens.access_token;

//         // DEBUG: see what scopes this token actually has
//         const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
//         const meta = await ti.json();
//         console.log('granted scopes:', meta.scope); // should contain photoslibrary.readonly

//         // Call Photos Library
//         const resp = await fetch(
//             "https://photoslibrary.googleapis.com/v1/mediaItems:search",
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     pageSize: 12,
//                     filters: { mediaTypeFilter: { mediaTypes: ["PHOTO"] } },
//                     // Optional: albumId: "ALBUM_ID"
//                     // Optional: dateFilter, featureFilter, etc.
//                 }),
//             }
//         );

//         if (!resp.ok) {
//             const errBody = await resp.text();
//             console.error("Photos API error:", resp.status, errBody);
//             return res.status(502).send("Photos API error");
//         }

//         const data = await resp.json();
//         res.json({ photos: data.mediaItems || [] });

//     } catch (e) {
//         console.error('OAuth/Photos flow error:', e);
//         res.status(500).send('Failed to authenticate and fetch photos');
//     }
// });


// app.listen(3000, () => console.log("API listening on http://localhost:3000"));


// import express from 'express';
// import cors from 'cors';
// import { google } from 'googleapis';
// import dotenv from 'dotenv';
// dotenv.config();

// const app = express();
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

// const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// // Use ONLY readonly while debugging
// const scopes = ['https://www.googleapis.com/auth/photoslibrary.readonly'];

// app.get('/auth/google', (req, res) => {
//     const url = oauth2Client.generateAuthUrl({
//         access_type: 'offline',
//         prompt: 'select_account',
//         scope: [
//             'openid', 'email', 'profile',                   // diagnostic only
//             'https://www.googleapis.com/auth/photoslibrary.readonly'
//         ],
//         include_granted_scopes: false,
//     });
//     res.redirect(url);
// });

// app.get('/oauth2callback', async (req, res) => {
//     const { code } = req.query;
//     if (!code) return res.status(400).send('Missing code');

//     try {
//         const { tokens } = await oauth2Client.getToken(code);
//         oauth2Client.setCredentials(tokens);

//         const accessToken = tokens.access_token;

//         // DEBUG: verify token meta
//         const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
//         const meta = await ti.json();
//         console.log('aud:', meta.aud, 'azp:', meta.azp, 'scope:', meta.scope);

//         // 1) simplest GET first
//         let resp = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=10', {
//             headers: { Authorization: `Bearer ${accessToken}` },
//         });
//         if (!resp.ok) {
//             const body = await resp.text();
//             console.error('Photos API error (list):', resp.status, body);
//             return res.status(502).send('Photos API error');
//         }
//         const list = await resp.json();

//         // If success, you can also test :search
//         // const resp2 = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
//         //   method: 'POST',
//         //   headers: {
//         //     Authorization: `Bearer ${accessToken}`,
//         //     'Content-Type': 'application/json',
//         //   },
//         //   body: JSON.stringify({
//         //     pageSize: 12,
//         //     filters: { mediaTypeFilter: { mediaTypes: ['PHOTO'] } },
//         //   }),
//         // });

//         res.json({ photos: list.mediaItems || [] });
//     } catch (e) {
//         console.error('OAuth/Photos flow error:', e);
//         res.status(500).send('Failed to authenticate and fetch photos');
//     }
// });

// app.listen(3000, () => console.log('API listening on http://localhost:3000'));


import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import { google } from "googleapis";
import admin from "firebase-admin";
import vision from "@google-cloud/vision";
import { VertexAI } from "@google-cloud/vertexai";

dotenv.config();

const {
    PORT = 3000,
    FRONTEND_ORIGIN = "http://localhost:5173",
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
    FIREBASE_PROJECT_ID,
    VERTEX_LOCATION = "us-central1",
    VERTEX_MODEL = "gemini-1.5-flash",
} = process.env;


if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
    process.exit(1);
}

// ---------- Firebase Admin (ADC on GAE; locally set GOOGLE_APPLICATION_CREDENTIALS) ----------
if (!admin.apps.length) {
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
}
const db = admin.firestore();

// ---------- Express ----------
const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieSession({ name: "sid", keys: ["secret"], sameSite: "lax", httpOnly: true }));

// OAuth2 helper
function getClient(req) {
    const c = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    if (req.session.tokens) c.setCredentials(req.session.tokens);
    return c;
}
const requireGoogle = (req, res, next) =>
    req.session.tokens ? next() : res.status(401).json({ error: "not_authenticated_google" });

// Verify Firebase ID token to know uid (front-end will send it)
async function requireFirebaseUser(req, res, next) {
    try {
        const hdr = req.headers.authorization || "";
        const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "no_firebase_token" });
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = { uid: decoded.uid, email: decoded.email || null };
        next();
    } catch (e) {
        console.error("Firebase verify failed", e);
        res.status(401).json({ error: "invalid_firebase_token" });
    }
}

// BEFORE any routes
app.set('trust proxy', 1); // safe even on localhost

app.use(cookieSession({
    name: "sid",
    keys: [process.env.SESSION_SECRET || "dev-secret"],
    sameSite: "lax",
    httpOnly: true,
    secure: false,            // IMPORTANT for http://localhost
    maxAge: 7 * 24 * 60 * 60 * 1000,
}));

// ---- OAuth flow ----
app.get("/auth/google", (req, res) => {
    const client = getClient(req);
    const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: false,
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/photoslibrary.readonly", // The required scope
            "https://www.googleapis.com/auth/photoslibrary"
            //"https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata"
        ],
    });
    res.redirect(url);
});

// app.get("/oauth2callback", async (req, res) => {
//     const client = getClient(req);
//     try {
//         const { tokens } = await client.getToken(req.query.code);
//         req.session.tokens = tokens; // keep session
//         res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
//     } catch (e) {
//         console.error("OAuth error", e);
//         res.status(500).send("OAuth failed");
//     }
// });

app.get("/oauth2callback", async (req, res) => {
    const client = getClient(req);
    try {
        const { tokens } = await client.getToken(req.query.code);

        console.log("--- TOKEN DEBUG ---");
        console.log("1. Scopes from Google:", tokens.scope);
        console.log("2. New Access Token starts with:", tokens.access_token?.slice(0, 10));

        // 1. Capture the old refresh token before we wipe the session
        // (Google only sends a refresh token on the FIRST authorization, so we must preserve it)
        const oldRefreshToken = req.session?.tokens?.refresh_token;

        // 2. Wipe the session completely by overwriting it with a new object
        // (This clears out any old junk or bloat causing the cookie overflow)
        req.session = {
            tokens: {
                access_token: tokens.access_token,
                // Use the new refresh token if available, otherwise keep the old one
                refresh_token: tokens.refresh_token || oldRefreshToken,
                scope: tokens.scope,
                expiry_date: tokens.expiry_date
            }
        };

        console.log("3. Session successfully updated.");

        res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
    } catch (e) {
        console.error("OAuth error", e);
        res.status(500).send("OAuth failed");
    }
});

// 1. Route to list photos (returns Metadata to frontend)
app.get("/api/photos", requireGoogle, async (req, res) => {
    try {
        const client = getClient(req);

        // Check if the token exists before trying to use it
        if (!req.session.tokens) {
            return res.status(401).json({ error: "no_tokens_in_session" });
        }

        // DEBUG LOG
        console.log("3. API using Token starting with:", req.session.tokens.access_token?.slice(0, 10));

        const { token } = await client.getAccessToken();

        const url = "https://photoslibrary.googleapis.com/v1/mediaItems";
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (!r.ok) {
            const text = await r.text();

            // Check if the error is about scopes
            if (r.status === 403 && text.includes("insufficient authentication scopes")) {
                console.log("Stale scopes detected. Clearing session.");
                req.session = null; // DESTROY the session
                // Return 401 so frontend knows to redirect to login
                return res.status(401).json({ error: "scope_mismatch_relogin_required" });
            }

            console.error("Photos list error:", r.status, text);
            return res.status(r.status).send(text);
        }

        const data = await r.json();
        // ... rest of your mapping logic ...
        const items = (data.mediaItems || []).map(mi => ({
            id: mi.id,
            filename: mi.filename,
            thumbUrl: `${mi.baseUrl}=w500-h500`,
            baseUrl: mi.baseUrl
        }));

        res.json({ items, nextPageToken: data.nextPageToken });

    } catch (e) {
        console.error("api/photos failed:", e);
        res.status(500).json({ error: "photos_failed" });
    }
});


// 2. Route to process/download the actual image (Backend)
app.post("/api/process-image", requireGoogle, async (req, res) => {
    const { baseUrl } = req.body;
    const client = getClient(req);
    const { token } = await client.getAccessToken();

    try {
        // Append '=d' to download the original bytes
        const downloadUrl = `${baseUrl}=d`;

        const imageReq = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!imageReq.ok) throw new Error("Failed to download image bytes");

        const arrayBuffer = await imageReq.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // NOW you have the actual image in 'buffer'.
        // You can pass this buffer to Google Vision API or save to Firestore.

        console.log(`Successfully downloaded ${buffer.length} bytes`);
        res.json({ success: true, size: buffer.length });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ------------- 1) List recent photos for top grid-------------
// app.get("/api/photos", requireGoogle, async (req, res) => {
//     try {
//         const client = getClient(req);
//         const { token } = await client.getAccessToken();
//         if (!token) return res.status(401).json({ error: "no_access_token" });

//         const url = "https://photoslibrary.googleapis.com/v1/mediaItems";
//         console.log("Token: ", token);
//         const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//         console.log(r);
//         const hdr = r.headers.get("www-authenticate");  // <-- very useful hint
//         const text = await r.text();
//         console.log("text: ", text);

//         if (!r.ok) {
//             console.error("Photos list error:", r.status, hdr, text);
//             return res.status(r.status).type("application/json").send(text);
//         }

//         const data = JSON.parse(text);
//         console.log("data: ", data);
//         const items = (data.mediaItems || []).map(mi => ({
//             id: mi.id,
//             filename: mi.filename,
//             mimeType: mi.mimeType,
//             baseUrl: mi.baseUrl,
//             thumbUrl: `${mi.baseUrl}=w512-h512`,
//         }));
//         console.log("items: ", items);
//         res.json({ items, nextPageToken: data.nextPageToken || null });
//     } catch (e) {
//         console.error("api/photos failed:", e);
//         res.status(500).json({ error: "photos_failed" });
//     }
// });



// Initialize clients once
const visionClient = new vision.ImageAnnotatorClient();
const vertex = new VertexAI({ project: FIREBASE_PROJECT_ID, location: VERTEX_LOCATION });
const genModel = vertex.getGenerativeModel({ model: VERTEX_MODEL });

// helper: download original bytes using Google Photos baseUrl (=d)
async function downloadBytes(accessToken, baseUrl) {
    const r = await fetch(`${baseUrl}=d`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`download failed ${r.status}`);
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
}

// ------------- 2) Process selected photos -------------
// app.post("/api/process", requireGoogle, requireFirebaseUser, async (req, res) => {
//     const client = getClient(req);
//     const { token: accessToken } = await client.getAccessToken();
//     const { uid } = req.user;
//     const { items, petName = "", prompt = "" } = req.body; // items: [{id, baseUrl, filename, mimeType}]

//     if (!Array.isArray(items) || items.length === 0) {
//         return res.status(400).json({ error: "no_items" });
//     }

//     const results = [];

//     for (const it of items) {
//         try {
//             // 1) bytes
//             const imgBytes = await downloadBytes(accessToken, it.baseUrl);

//             // 2) Vision labels/moods
//             const [resp] = await visionClient.annotateImage({
//                 image: { content: imgBytes },
//                 features: [{ type: "LABEL_DETECTION", maxResults: 12 }, { type: "SAFE_SEARCH_DETECTION" }],
//             });

//             const labels = (resp.labelAnnotations || [])
//                 .filter(l => (l.score || 0) >= 0.6)
//                 .map(l => l.description.toLowerCase());

//             // quick mood heuristic from labels (you can tune this)
//             const moods = [];
//             if (labels.some(x => ["dog", "puppy", "play"].includes(x))) moods.push("playful");
//             if (labels.some(x => ["sleep", "rest"].includes(x))) moods.push("sleepy");
//             if (labels.includes("outdoor")) moods.push("outdoor");

//             // 3) Gemini caption
//             const userPrompt =
//                 `Write a short (<=18 words) friendly caption for a social post about a pet photo.
// Pet name: ${petName || "—"}.
// Tone: concise, positive. Avoid emojis unless the prompt mentions them.
// Context from vision labels: ${labels.join(", ")}.
// Extra user prompt (optional): ${prompt || "—"}.`;

//             const g = await genModel.generateContent({
//                 contents: [{ role: "user", parts: [{ text: userPrompt }] }],
//             });
//             const caption =
//                 g.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "A lovely moment.";

//             // 4) Save to Firestore
//             const docRef = db.doc(`users/${uid}/photos/${it.id}`);
//             await docRef.set(
//                 {
//                     source: "google-photos",
//                     mediaItemId: it.id,
//                     filename: it.filename,
//                     mimeType: it.mimeType,
//                     baseUrl: it.baseUrl,
//                     productUrl: it.productUrl || null,
//                     width: it.width || null,
//                     height: it.height || null,
//                     createTime: it.createTime || null,

//                     labels,
//                     moods,
//                     caption,
//                     processedAt: admin.firestore.FieldValue.serverTimestamp(),
//                 },
//                 { merge: true }
//             );

//             results.push({
//                 id: it.id,
//                 url: `${it.baseUrl}=w1600-h1600`,
//                 caption,
//                 labels,
//                 moods,
//             });
//         } catch (e) {
//             console.error("process failed for", it.id, e);
//         }
//     }

//     res.json({ processed: results });
// });

// ------------- 3) Get processed items (optional lower section) -------------
app.get("/api/processed", requireFirebaseUser, async (req, res) => {
    const snap = await db.collection(`users/${req.user.uid}/photos`).orderBy("processedAt", "desc").limit(50).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ items });
});

//debug endpoints after OAuth
app.get("/api/debug/session", (req, res) => {
    res.json({
        hasTokens: !!req.session.tokens,
        tokenKeys: req.session.tokens ? Object.keys(req.session.tokens) : [],
    });
});

app.get("/api/debug/tokeninfo", requireGoogle, async (req, res) => {
    const client = getClient(req);
    const { token } = await client.getAccessToken();
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    res.status(r.status).json(await r.json());
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.status(200).send("Logged out");
});


app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

