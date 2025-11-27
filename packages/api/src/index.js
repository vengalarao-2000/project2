import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import env from "./config/env.js";

// import separated route files
import authRoutes from "./routes/authRoutes.js";
import pickerRoutes from "./routes/pickerRoutes.js";
import processRoutes from "./routes/processRoutes.js";
import sessionRoutes from './routes/sessionRoutes.js'
import editRoutes from './routes/editRoutes.js';

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
    secure: false, // set to true in production
    maxAge: 7 * 24 * 60 * 60 * 1000,
}));

// register routes
app.use(authRoutes);
app.use(pickerRoutes);
app.use(processRoutes);
app.use(sessionRoutes);
app.use(editRoutes);

app.listen(env.PORT, () => {
    console.log(`server running on port ${env.PORT}`);
});