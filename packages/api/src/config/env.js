import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 1. Get the directory name of the current file (src/config)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This finds the .env at the project root reliably
dotenv.config({ path: path.resolve(__dirname, "../.env") });


const env = {
    PORT: process.env.PORT || 3000,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION || "us-central1",
    VERTEX_MODEL: process.env.VERTEX_MODEL || "gemini-2.5-flash",
    SESSION_SECRET: process.env.SESSION_SECRET || "dev-secret",
    //for vision API
    GCP_PROJECT_ID: process.env.GOOGLE_PROJ_ID,

};

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.error("Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file");
    console.error(`Checked for file at: ${path.resolve(__dirname, "../.env")}`);
    process.exit(1);
}

export default env;