
import {getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo7lK1kQuEX2VLzluwwcU3KWY3IcmcVIo",
  authDomain: "paws-and-pixels.firebaseapp.com",
  projectId: "paws-and-pixels",
  storageBucket: "paws-and-pixels.firebasestorage.app",
  messagingSenderId: "153148288387",
  appId: "1:153148288387:web:a95881d6d722407a965ab6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
