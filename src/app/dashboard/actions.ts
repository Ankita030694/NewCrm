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

export interface Letter {
    id: string;
    clientName: string;
    letterType?: string;
    status?: string;
    createdAt?: any;
    bankName?: string;
    dueDate?: string;
    advocateName?: string;
    source_database?: string;
}

export interface DashboardData {
    salesUsers: SalesUser[];
    targetData: TargetData[];
    pendingLetters: Letter[];
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
        if (!db) {
            throw new Error('Firebase Admin SDK not initialized');
        }

        // 1. Fetch Users (Optimized: Only active sales and advocates)
        const usersRef = db.collection('users');
        const usersSnap = await usersRef.where('status', '==', 'active').get();

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

        // 3. Fetch Pending Letters (Optimized: Only where request_letter != true)
        const clientsRef = db.collection('clients');
        const clientsSnap = await clientsRef.where('request_letter', '!=', true).get();

        const pendingLettersList: Letter[] = [];

        clientsSnap.forEach(doc => {
            const clientData = doc.data();
            // Double check in case query included missing fields or other edge cases
            if (clientData.request_letter !== true) {
                const serializedClient = serializeData(clientData);

                pendingLettersList.push({
                    id: doc.id,
                    clientName: serializedClient.name,
                    bankName: serializedClient.bank || 'Not specified',
                    dueDate: serializedClient.nextFollowUp || serializedClient.lastFollowUp,
                    advocateName: serializedClient.alloc_adv || 'Unassigned',
                    source_database: serializedClient.source_database || 'Not specified'
                });
            }
        });

        return {
            salesUsers: serializeData(salesUsersList),
            targetData: serializeData(targetsData),
            pendingLetters: pendingLettersList,
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
        const paymentsSnap = await paymentsRef
            .where('status', '==', 'approved')
            .get();

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

        // Fetch ALL targets in ONE query (Optimized from N+1)
        const targetsRef = db.collection('targets');
        const targetsSnap = await targetsRef.get();

        const targetsByMonth: { [key: string]: number } = {};

        // Process all targets in memory
        // This avoids N+1 queries.
        // We need to fetch subcollections for monthly targets.
        // Wait, fetching subcollections for ALL docs is still N+1 if we iterate.
        // BUT, we can use a Collection Group query if 'sales_targets' is a subcollection!
        // Let's try to fetch all 'sales_targets' across the DB.

        const salesTargetsGroupSnap = await db.collectionGroup('sales_targets').get();

        salesTargetsGroupSnap.forEach(doc => {
            // The parent doc ID should be the monthKey (e.g. Jan_2025)
            // But for collection group queries, we need to check the ref.parent.parent.id
            const parentDoc = doc.ref.parent.parent;
            if (parentDoc) {
                const monthKey = parentDoc.id;
                const amount = doc.data().amountCollectedTarget || 0;
                targetsByMonth[monthKey] = (targetsByMonth[monthKey] || 0) + amount;
                allMonthsSet.add(monthKey);
            }
        });

        // Also handle legacy targets stored directly on the doc (if any)
        targetsSnap.forEach(doc => {
            const monthKey = doc.id;
            if (monthKey.includes('_')) {
                // If we didn't find any sales_targets for this month, check the doc itself
                if (!targetsByMonth[monthKey]) {
                    const data = doc.data();
                    if (data.amountCollectedTarget) {
                        targetsByMonth[monthKey] = data.amountCollectedTarget;
                        allMonthsSet.add(monthKey);
                    }
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
