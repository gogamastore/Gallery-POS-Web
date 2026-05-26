
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDIl-RgVHblRZx-MZHlhRWEOK90iw6eEyI",
  authDomain: "gallerypos.firebaseapp.com",
  projectId: "gallerypos",
  storageBucket: "gallerypos.firebasestorage.app",
  messagingSenderId: "889047904404",
  appId: "1:889047904404:web:e681227fb498239fa5c481",
  measurementId: "G-SYMNEX7VYL"
};

// Initialize Firebase using a singleton pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;


export { app, auth, db, storage, messaging };
