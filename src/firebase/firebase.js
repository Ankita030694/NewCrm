// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_WORKSPACE_API,

  authDomain: "amacrm-76fd1.firebaseapp.com",

  databaseURL: "https://amacrm-76fd1-default-rtdb.firebaseio.com",

  projectId: "amacrm-76fd1",

  storageBucket: "amacrm-76fd1.firebasestorage.app",

  messagingSenderId: "1008668372239",
 
  appId: "1:1008668372239:web:03cca86d1675df6450227a",

  measurementId: "G-X1B7CKLRST",
};

// Initialize Firebase with a specific app name to avoid conflicts
const app = initializeApp(firebaseConfig, "crmApp");
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, db, auth, storage, functions };
