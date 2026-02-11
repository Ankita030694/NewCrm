
import { getBillcutHistoryData } from '../src/app/dashboard/actions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    const serviceAccount = require('../../permission.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function verify() {
    console.log('Fetching Billcut History Data...');
    try {
        const history = await getBillcutHistoryData();
        console.table(history);
        console.log('Total records:', history.length);

        // simple check for earned > 0 to see if it picked up anything
        const totalEarned = history.reduce((sum, item) => sum + item.earned, 0);
        console.log('Total Earned:', totalEarned);

    } catch (error) {
        console.error('Error:', error);
    }
}

verify();
