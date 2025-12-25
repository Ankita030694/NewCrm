
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.log('Could not load serviceAccountKey.json. Trying default creds.');
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
        let value = ts;
        if (ts && typeof ts === 'object') {
            if (ts.toDate) {
                type = 'FirestoreTimestamp';
                value = ts.toDate().toISOString();
            }
            else if (ts._seconds) {
                type = 'SerializedTimestamp';
                value = new Date(ts._seconds * 1000).toISOString();
            }
            else if (ts instanceof Date) {
                type = 'Date';
                value = ts.toISOString();
            }
            else type = 'Object';
        }
        console.log(`ID: ${doc.id}, Type: ${type}, Value: ${value}`);
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
  }
}

checkTimestamps();
