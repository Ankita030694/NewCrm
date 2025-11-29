import admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';

// --- CRM Admin (Default App) ---
// Initialize Firebase Admin for CRM if not already initialized (Default App)
if (!getApps().length) {
  try {
    // Check if required env vars are present to avoid initialization errors
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log("[Firebase Admin] Initialized default app (CRM)");
    } else {
       console.warn("[Firebase Admin] Missing CRM credentials in environment variables. Default app not initialized.");
    }
  } catch (error) {
    console.error("[Firebase Admin] Failed to initialize default app (CRM):", error);
  }
}

// Export auth and storage for CRM (Default)
// These will use the default app initialized above
export const auth = admin.auth();
export const storage = admin.storage();
export const db = admin.firestore();

// Legacy aliases for CRM (to maintain compatibility with existing code)
export const adminAuth = auth;
export const adminStorage = storage;
export const adminDb = db;
export const adminMessaging = admin.messaging();


// --- AMA App Admin (Named App) ---
const AMA_APP_ADMIN_NAME = 'ama-mobile-admin';
let amaApp: App | undefined;

const existingAmaApp = getApps().find(app => app.name === AMA_APP_ADMIN_NAME);

if (existingAmaApp) {
  amaApp = existingAmaApp;
} else {
  // Initialize specific app for AMA Mobile App
  // Attempt to load from service account file first, then env vars
  try {
      const serviceAccountPath = path.join(process.cwd(), '/src/firebase/ama-app-service.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        // console.log(`[Firebase Admin] Attempting to load service account from: ${serviceAccountPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        // console.log(`[Firebase Admin] Service account loaded successfully. Project ID: ${serviceAccount.project_id}`);
        
        amaApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        }, AMA_APP_ADMIN_NAME);
        console.log("[Firebase Admin] Initialized named app 'ama-mobile-admin' with service account file.");
      } else {
        // Fallback to env vars
        const privateKey = process.env.AMA_MOBILE_PRIVATE_KEY;
        const projectId = process.env.AMA_MOBILE_PROJECT_ID;
        const clientEmail = process.env.AMA_MOBILE_CLIENT_EMAIL;

        if (privateKey && projectId && clientEmail) {
            amaApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey?.replace(/\\n/g, '\n'),
            }),
            storageBucket: process.env.AMA_MOBILE_STORAGE_BUCKET,
            }, AMA_APP_ADMIN_NAME);
            console.log("[Firebase Admin] Initialized named app 'ama-mobile-admin' with env vars.");
        } else {
             console.warn("[Firebase Admin] Failed to initialize ama-mobile-admin: No credentials found (file or env).");
        }
      }
  } catch (error) {
      console.error("[Firebase Admin] Error initializing AMA App Admin:", error);
  }
}

// Export instances for the named app (AMA App)
// We export them regardless, but usage might fail if initialization failed.
// Using explicit check to avoid crashing on export if app is missing (though admin.auth(undefined) might just be default app? No, it requires app or undefined means default).
// Since we want to be sure we are using the named app, we pass amaApp.
// If amaApp is undefined, we should probably not export valid instances or export proxies that throw. 
// For now, we'll stick to the pattern but be aware. 

export const amaAppAuth = amaApp ? admin.auth(amaApp) : undefined;
export const amaAppStorage = amaApp ? admin.storage(amaApp) : undefined; 
export const amaAppDb = amaApp ? admin.firestore(amaApp) : undefined;
export const amaAppMessaging = amaApp ? admin.messaging(amaApp) : undefined;

export default admin;
