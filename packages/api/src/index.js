import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import env from "./config/env.js";
import { fileURLToPath } from "url";
import path from "path";

// import separated route files
import authRoutes from "./routes/authRoutes.js";
import pickerRoutes from "./routes/pickerRoutes.js";
import processRoutes from "./routes/processRoutes.js";
import sessionRoutes from './routes/sessionRoutes.js'
import editRoutes from './routes/editRoutes.js';
import logRoutes from './routes/logRoutes.js';

const app = express();

// increase payload limit for large image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// global middleware setup
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.set('trust proxy', 1);
app.use(cookieSession({
    name: "sid",
    keys: [env.SESSION_SECRET],
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
}));

// register routes
app.use(authRoutes);
app.use(pickerRoutes);
app.use(processRoutes);
app.use(sessionRoutes);
app.use(editRoutes);
//for frontend logging
app.use(logRoutes);

//serve the static files in production
// Convert ES Module URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define where the React files live.
// Your build script will move 'packages/web/dist' -> 'packages/api/public'
// So relative to this file (src/index.js), it is one level up in '../public'
const publicPath = path.join(__dirname, "../public");

// Serve static assets (JS, CSS, Images) from the build folder
app.use(express.static(publicPath));

// Handle Client-Side Routing (SPA Fallback)
// If a request comes in that doesn't match an API route (e.g. /dashboard, /review/123),
// send the React index.html file so React Router can handle it.
app.get(/.*/, (req, res) => {
    // Safety check: If it looks like an API call but wasn't caught above, return 404 JSON
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
    }

    // Otherwise, send the React app
    res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`server running on port ${env.PORT}`);
});