
import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
// We'll try to load service account from standard location or env
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;
try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.log('Could not load serviceAccountKey.json from root. Trying to use application default credentials or env vars.');
}

if (!admin.apps.length) {
    try {
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (e) {
        console.error('Failed to initialize admin:', e);
        process.exit(1);
    }
}

const db = admin.firestore();

async function checkTimestamps() {
    console.log('Fetching payments...');
    try {
        const snapshot = await db.collection('payments').limit(20).get();
        if (snapshot.empty) {
            console.log('No payments found.');
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            const ts = data.timestamp;
            let type = typeof ts;
            if (ts && typeof ts === 'object') {
                if (ts.toDate) type = 'FirestoreTimestamp';
                else if (ts._seconds) type = 'SerializedTimestamp';
                else if (ts instanceof Date) type = 'Date';
                else type = 'Object';
            }
            console.log(`ID: ${doc.id}, Type: ${type}, Value: ${ts}`);
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
    }
}

checkTimestamps();
