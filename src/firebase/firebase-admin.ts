import admin from 'firebase-admin';
import { getApps, App } from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';

const AMA_APP_ADMIN_NAME = 'ama-mobile-admin';
let amaApp: App;

// Initialize specific app for AMA Mobile App
const existingAmaApp = getApps().find(app => app.name === AMA_APP_ADMIN_NAME);

if (existingAmaApp) {
  amaApp = existingAmaApp;
} else {
  try {
      const serviceAccountPath = path.join(process.cwd(), '/src/firebase/ama-app-service.json');
      console.log(`[Firebase Admin] Attempting to load service account from: ${serviceAccountPath}`);
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log(`[Firebase Admin] Service account loaded successfully. Project ID: ${serviceAccount.project_id}`);
        
        amaApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        }, AMA_APP_ADMIN_NAME);
        console.log("[Firebase Admin] Initialized named app 'ama-mobile-admin' with service account file.");
      } else {
        console.warn(`[Firebase Admin] Service account file not found at ${serviceAccountPath}`);
        throw new Error("Service account file not found");
      }
  } catch (error) {
      console.warn("Failed to load service account from file for named app, trying env vars:", error);
       // Fallback
       // Use specific env vars for AMA Mobile App to avoid conflicts with other projects
       const privateKey = process.env.AMA_MOBILE_PRIVATE_KEY;
       const projectId = process.env.AMA_MOBILE_PROJECT_ID;
       const clientEmail = process.env.AMA_MOBILE_CLIENT_EMAIL;

       if (privateKey) {
          amaApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId: projectId,
              clientEmail: clientEmail,
              privateKey: privateKey?.replace(/\\n/g, '\n'),
            }),
            storageBucket: process.env.AMA_MOBILE_STORAGE_BUCKET,
          }, AMA_APP_ADMIN_NAME);
       } else {
         throw new Error("Failed to initialize ama-mobile-admin: No credentials found in file or environment variables.");
       }
  }
}

// Initialize Default Firebase Admin (if not already) - potentially for legacy use or other parts of the system
// logic kept for backward compatibility but wrapped safe
if (!getApps().length) {
   // ... existing logic for default app if needed, or just leave it be ...
   // For now, we focus on the named app.
}

// Export instances for the named app
export const amaAppAuth = admin.auth(amaApp);
export const amaAppStorage = admin.storage(amaApp); 
export const amaAppDb = admin.firestore(amaApp);
export const amaAppMessaging = admin.messaging(amaApp);

// Legacy exports (might point to default app which could be CRM or App depending on init order)
// We keep them to avoid breaking other imports, but we should migrate away from them if they are intended for the App.
export const adminAuth = admin.auth(); // connects to default app
export const adminStorage = admin.storage(); // connects to default app
export const adminDb = admin.firestore(); // connects to default app
export const adminMessaging = admin.messaging(); // connects to default app

export default admin;
