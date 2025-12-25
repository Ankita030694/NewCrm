'use server'

import { db } from '@/firebase/firebase-admin'

// Define interfaces for the data structures
export interface SalesUser {
    id: string;
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    uid?: string;
    status?: string;
    identifiers: string[];
    role?: string;
}

export interface TargetData {
    id: string;
    userId?: string;
    userName?: string;
    amountCollected?: number;
    amountCollectedTarget?: number;
    convertedLeads?: number;
    convertedLeadsTarget?: number;
    [key: string]: any;
}

export interface DashboardData {
    salesUsers: SalesUser[];
    targetData: TargetData[];
    stats: {
        totalUsers: number;
        totalSales: number;
        totalAdvocates: number;
    };
}

export interface HistoryData {
    month: string;
    year: number;
    target: number;
    collected: number;
    fullLabel: string;
}

// Helper function to serialize Firestore data
const serializeData = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(serializeData);
    }

    if (typeof data === 'object') {
        // Handle Firestore Timestamp
        if (data._seconds !== undefined && data._nanoseconds !== undefined) {
            return new Date(data._seconds * 1000).toISOString();
        }

        // Handle Date objects
        if (data instanceof Date) {
            return data.toISOString();
        }

        // Handle other objects recursively
        const serialized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                serialized[key] = serializeData(data[key]);
            }
        }
        return serialized;
    }

    return data;
};

export async function getAdminDashboardData(month: string, year: number): Promise<DashboardData> {
    try {
        console.time('getAdminDashboardData:Total');
        if (!db) {
            throw new Error('Firebase Admin SDK not initialized');
        }

        // 1. Fetch Users (Optimized: Only active sales and advocates)
        console.time('getAdminDashboardData:Users');
        const usersRef = db.collection('users');
        const usersSnap = await usersRef.where('status', '==', 'active').get();
        console.timeEnd('getAdminDashboardData:Users');

        let sales = 0;
        let advocates = 0;
        const salesUsersList: SalesUser[] = [];

        usersSnap.forEach((doc) => {
            const userData = doc.data();

            if (userData.role === 'sales') {
                sales++;
                const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

                salesUsersList.push({
                    id: doc.id,
                    uid: userData.uid,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email,
                    fullName: fullName,
                    status: userData.status,
                    role: userData.role,
                    identifiers: [
                        doc.id,
                        userData.uid || '',
                        userData.firstName || '',
                        userData.lastName || '',
                        fullName,
                        userData.email || ''
                    ].filter(Boolean)
                });
            }
            if (userData.role === 'advocate') advocates++;
        });

        // 2. Fetch Targets & Payments
        const monthDocId = `${month}_${year}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const targetMonth = monthNames.indexOf(month);

        // Fetch payments for revenue calculation (Optimized: Only approved payments for the selected month)
        let individualPayments: { [userId: string]: number } = {};
        let hasPaymentData = false;

        try {
            const startOfMonth = new Date(year, targetMonth, 1);
            const endOfMonth = new Date(year, targetMonth + 1, 0, 23, 59, 59, 999);

            // Format dates for string comparison (ISO format)
            const startOfMonthStr = startOfMonth.toISOString();
            const endOfMonthStr = endOfMonth.toISOString();

            const paymentsRef = db.collection('payments');

            console.time('getAdminDashboardData:Payments');
            // Run parallel queries to handle both Timestamp/Date objects and ISO strings
            const [timestampSnap, stringSnap] = await Promise.all([
                // Query for Timestamp/Date fields
                paymentsRef
                    .where('status', '==', 'approved')
                    .where('timestamp', '>=', startOfMonth)
                    .where('timestamp', '<=', endOfMonth)
                    .get(),
                // Query for String fields
                paymentsRef
                    .where('status', '==', 'approved')
                    .where('timestamp', '>=', startOfMonthStr)
                    .where('timestamp', '<=', endOfMonthStr)
                    .get()
            ]);
            console.timeEnd('getAdminDashboardData:Payments');

            const processPaymentDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                const payment = doc.data();
                const amount = parseFloat(payment.amount) || 0;
                hasPaymentData = true;

                if (payment.userId || payment.assignedTo || payment.salesperson) {
                    const userId = payment.userId || payment.assignedTo || payment.salesperson;
                    individualPayments[userId] = (individualPayments[userId] || 0) + amount;
                }
            };

            // Use a Set to deduplicate if any docs overlap (unlikely but safe)
            const processedIds = new Set<string>();

            timestampSnap.forEach(doc => {
                if (!processedIds.has(doc.id)) {
                    processPaymentDoc(doc);
                    processedIds.add(doc.id);
                }
            });

            stringSnap.forEach(doc => {
                if (!processedIds.has(doc.id)) {
                    processPaymentDoc(doc);
                    processedIds.add(doc.id);
                }
            });

        } catch (error) {
            console.error('Error fetching payments:', error);
        }

        // Fetch Targets
        console.time('getAdminDashboardData:Targets');
        const monthlyDocRef = db.collection('targets').doc(monthDocId);
        const monthlyDocSnap = await monthlyDocRef.get();

        const targetsData: TargetData[] = [];

        if (monthlyDocSnap.exists) {
            const salesTargetsRef = monthlyDocRef.collection('sales_targets');
            const salesTargetsSnap = await salesTargetsRef.get();

            salesTargetsSnap.forEach(doc => {
                const data = doc.data();
                let collectedAmount = data.amountCollected || 0;

                if (hasPaymentData) {
                    const userIdentifiers = [
                        data.userId,
                        data.userName,
                        doc.id
                    ].filter(Boolean);

                    let foundPayment = false;
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
                            foundPayment = true;
                            break;
                        }
                    }
                }

                targetsData.push({
                    id: doc.id,
                    userId: data.userId,
                    userName: data.userName,
                    amountCollected: collectedAmount,
                    amountCollectedTarget: data.amountCollectedTarget || 0,
                    convertedLeads: data.convertedLeads || 0,
                    convertedLeadsTarget: data.convertedLeadsTarget || 0
                });
            });
        } else {
            // Fallback to legacy targets
            const targetsRef = db.collection('targets');
            const targetsSnap = await targetsRef.get();

            targetsSnap.forEach(doc => {
                const data = doc.data();
                if (data.month && data.year) return; // Skip monthly docs

                let collectedAmount = data.amountCollected || 0;
                if (hasPaymentData) {
                    const userIdentifiers = [
                        data.userId,
                        data.userName,
                        doc.id
                    ].filter(Boolean);

                    let foundPayment = false;
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
                            foundPayment = true;
                            break;
                        }
                    }
                }

                targetsData.push({
                    id: doc.id,
                    ...data,
                    amountCollected: collectedAmount
                });
            });
        }
        console.timeEnd('getAdminDashboardData:Targets');

        console.timeEnd('getAdminDashboardData:Total');
        return {
            salesUsers: serializeData(salesUsersList),
            targetData: serializeData(targetsData),
            stats: {
                totalUsers: salesUsersList.length,
                totalSales: sales,
                totalAdvocates: advocates
            }
        };

    } catch (error) {
        console.error('Error in getAdminDashboardData:', error);
        throw new Error('Failed to fetch admin dashboard data');
    }
}

export async function getDashboardHistory(endMonth: string, endYear: number): Promise<HistoryData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Fetch ALL approved payments
        // NOTE: This is still heavy if there are millions of payments. 
        // For "All Time" history, we need all payments. 
        // Optimization: We could cache this or use aggregation queries if Firestore supports it (count/sum).
        // But for now, we keep it as is for payments, but optimize TARGETS below.
        const paymentsRef = db.collection('payments');

        console.time('getDashboardHistory:Payments');
        const paymentsSnap = await paymentsRef
            .where('status', '==', 'approved')
            .get();
        console.timeEnd('getDashboardHistory:Payments');

        // Aggregate payments by month
        const paymentsByMonth: { [key: string]: number } = {};
        const allMonthsSet = new Set<string>();

        paymentsSnap.forEach(doc => {
            const payment = doc.data();
            if (payment.timestamp) {
                let paymentDate: Date;
                if (typeof payment.timestamp === 'string') {
                    paymentDate = new Date(payment.timestamp);
                } else if (payment.timestamp.toDate) {
                    paymentDate = payment.timestamp.toDate();
                } else if (payment.timestamp._seconds) {
                    paymentDate = new Date(payment.timestamp._seconds * 1000);
                } else {
                    paymentDate = new Date(payment.timestamp);
                }

                if (!isNaN(paymentDate.getTime())) {
                    const monthKey = `${monthNames[paymentDate.getMonth()]}_${paymentDate.getFullYear()}`;
                    const amount = parseFloat(payment.amount) || 0;
                    paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + amount;
                    allMonthsSet.add(monthKey);
                }
            }
        });

        // Fetch ALL targets in ONE query
        const targetsRef = db.collection('targets');
        console.time('getDashboardHistory:Targets');
        const targetsSnap = await targetsRef.get();
        console.timeEnd('getDashboardHistory:Targets');

        const targetsByMonth: { [key: string]: number } = {};

        // Optimization: Use the pre-calculated 'total' field in the monthly document
        // This avoids fetching all subcollections or using collectionGroup queries.
        targetsSnap.forEach(doc => {
            const monthKey = doc.id;
            // Ensure it's a monthly doc (e.g., "Jan_2025")
            if (monthKey.includes('_')) {
                const data = doc.data();

                // Check for the new 'total' string field (e.g., "27,49,999")
                if (data.total) {
                    // Remove commas and convert to number
                    const cleanTotal = String(data.total).replace(/,/g, '');
                    targetsByMonth[monthKey] = parseFloat(cleanTotal) || 0;
                }
                // Fallback to legacy field if 'total' is missing
                else if (data.amountCollectedTarget) {
                    targetsByMonth[monthKey] = data.amountCollectedTarget;
                }
            }
        });

        const sortedMonths = Array.from(allMonthsSet).sort((a, b) => {
            const [monthA, yearA] = a.split('_');
            const [monthB, yearB] = b.split('_');

            if (parseInt(yearA) !== parseInt(yearB)) {
                return parseInt(yearA) - parseInt(yearB);
            }
            return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
        });

        const historyData: HistoryData[] = [];

        for (const monthKey of sortedMonths) {
            const [month, yearStr] = monthKey.split('_');
            const year = parseInt(yearStr);

            historyData.push({
                month: month,
                year: year,
                fullLabel: `${month} ${year}`,
                collected: paymentsByMonth[monthKey] || 0,
                target: targetsByMonth[monthKey] || 0
            });
        }

        return historyData;

    } catch (error) {
        console.error('Error fetching history data:', error);
        return [];
    }
}

export async function getOpsRevenueHistory(): Promise<HistoryData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Fetch ALL approved ops payments
        const opsPaymentsRef = db.collection('ops_payments');
        const opsPaymentsSnap = await opsPaymentsRef
            .where('status', '==', 'approved')
            .get();

        // Aggregate payments by month
        const paymentsByMonth: { [key: string]: number } = {};
        const allMonthsSet = new Set<string>();

        opsPaymentsSnap.forEach(doc => {
            const payment = doc.data();
            if (payment.timestamp) {
                let paymentDate: Date;
                if (typeof payment.timestamp === 'string') {
                    paymentDate = new Date(payment.timestamp);
                } else if (payment.timestamp.toDate) {
                    paymentDate = payment.timestamp.toDate();
                } else if (payment.timestamp._seconds) {
                    paymentDate = new Date(payment.timestamp._seconds * 1000);
                } else {
                    paymentDate = new Date(payment.timestamp);
                }

                if (!isNaN(paymentDate.getTime())) {
                    const monthKey = `${monthNames[paymentDate.getMonth()]}_${paymentDate.getFullYear()}`;
                    const amount = parseFloat(payment.amount) || 0;
                    paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + amount;
                    allMonthsSet.add(monthKey);
                }
            }
        });

        const sortedMonths = Array.from(allMonthsSet).sort((a, b) => {
            const [monthA, yearA] = a.split('_');
            const [monthB, yearB] = b.split('_');

            if (parseInt(yearA) !== parseInt(yearB)) {
                return parseInt(yearA) - parseInt(yearB);
            }
            return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
        });

        const historyData: HistoryData[] = [];

        for (const monthKey of sortedMonths) {
            const [month, yearStr] = monthKey.split('_');
            const year = parseInt(yearStr);

            historyData.push({
                month: month,
                year: year,
                fullLabel: `${month} ${year}`,
                collected: paymentsByMonth[monthKey] || 0,
                target: 0 // Ops revenue might not have a target in the same way, or we'd need to fetch it if it exists. Assuming 0 for now as per request "ops revenue"
            });
        }

        return historyData;

    } catch (error) {
        console.error('Error fetching ops revenue history:', error);
        return [];
    }
}
