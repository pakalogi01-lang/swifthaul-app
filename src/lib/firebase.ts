// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGJbhspksbAiunk9RkIhl3ODMSJRxbmXg",
  authDomain: "cargoconnect-m4v8q.firebaseapp.com",
  projectId: "cargoconnect-m4v8q",
  storageBucket: "cargoconnect-m4v8q.firebasestorage.app",
  messagingSenderId: "850958660859",
  appId: "1:850958660859:web:06eeb79184a6180e4c2c5e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, storage, db, auth, getAuth };
