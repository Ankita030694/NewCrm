import { getSalespersonWeeklyAnalytics } from '../src/app/dashboard/actions';

async function verify() {
    console.log('--- Verifying Salesperson Weekly Analytics ---');
    try {
        const data = await getSalespersonWeeklyAnalytics();
        console.log('Total Salespeople Found:', data.length);
        if (data.length > 0) {
            console.log('Sample Data (First Salesperson):');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('No salesperson data found. Check if there are approved payments in the payments collection.');
        }
    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
