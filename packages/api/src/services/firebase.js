import admin from "firebase-admin";
import env from "../config/env.js";

// initialize firebase only once
if (!admin.apps.length) {
    admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID, storageBucket: env.FIREBASE_STORAGE_BUCKET });
}

const db = admin.firestore();
//firebase storage service
const storage = admin.storage();
//reference to default bucket
const bucket = storage.bucket();


export { admin, db, bucket };