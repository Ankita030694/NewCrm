import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSeECr8rLsXuiWXDujOLRDU8c3FiLF8fM",
  authDomain: "amalegal-app.firebaseapp.com",
  projectId: "amalegal-app",
  storageBucket: "amalegal-app.firebasestorage.app",
  messagingSenderId: "7012510059",
  appId: "1:7012510059:web:851ec10c1f83c55ec5442e",
  measurementId: "G-7ELKYC91G6"
};

// Initialize Firebase
const appName = "ama-legal-app";
let app;

if (getApps().some(a => a.name === appName)) {
  app = getApp(appName);
} else {
  app = initializeApp(firebaseConfig, appName);
}

const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);

export { app, analytics, db };
