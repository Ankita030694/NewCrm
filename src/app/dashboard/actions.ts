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

        const monthDocId = `${month}_${year}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const targetMonth = monthNames.indexOf(month);
        const startOfMonth = new Date(year, targetMonth, 1);
        const endOfMonth = new Date(year, targetMonth + 1, 0, 23, 59, 59, 999);
        const startOfMonthStr = startOfMonth.toISOString();
        const endOfMonthStr = endOfMonth.toISOString();

        // Prepare Queries (Start them all at once)
        console.time('getAdminDashboardData:FetchAll');

        // 1. Users Query
        const usersPromise = db.collection('users').where('status', '==', 'active').get();

        // 2. Payments Query (Parallel Timestamp & String)
        const paymentsRef = db.collection('payments');
        const paymentsPromise = Promise.all([
            paymentsRef
                .where('status', '==', 'approved')
                .where('timestamp', '>=', startOfMonth)
                .where('timestamp', '<=', endOfMonth)
                .get(),
            paymentsRef
                .where('status', '==', 'approved')
                .where('timestamp', '>=', startOfMonthStr)
                .where('timestamp', '<=', endOfMonthStr)
                .get()
        ]);

        // 3. Targets Query (Conditional logic wrapped in async function)
        const targetsPromise = (async () => {
            const monthlyDocRef = db.collection('targets').doc(monthDocId);
            const monthlyDocSnap = await monthlyDocRef.get();

            if (monthlyDocSnap.exists) {
                const salesTargetsSnap = await monthlyDocRef.collection('sales_targets').get();
                return { type: 'monthly', doc: monthlyDocSnap, subDocs: salesTargetsSnap };
            } else {
                const targetsSnap = await db.collection('targets').get();
                return { type: 'legacy', docs: targetsSnap };
            }
        })();

        // Await all queries
        const [usersSnap, [timestampSnap, stringSnap], targetsResult] = await Promise.all([
            usersPromise,
            paymentsPromise,
            targetsPromise
        ]);
        console.timeEnd('getAdminDashboardData:FetchAll');

        // --- Process Users ---
        console.time('getAdminDashboardData:ProcessUsers');
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
        console.timeEnd('getAdminDashboardData:ProcessUsers');

        // --- Process Payments ---
        console.time('getAdminDashboardData:ProcessPayments');
        let individualPayments: { [userId: string]: number } = {};
        let hasPaymentData = false;

        const processPaymentDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const payment = doc.data();
            const amount = parseFloat(payment.amount) || 0;
            hasPaymentData = true;

            if (payment.userId || payment.assignedTo || payment.salesperson) {
                const userId = payment.userId || payment.assignedTo || payment.salesperson;
                individualPayments[userId] = (individualPayments[userId] || 0) + amount;
            }
        };

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
        console.timeEnd('getAdminDashboardData:ProcessPayments');

        // --- Process Targets ---
        console.time('getAdminDashboardData:ProcessTargets');
        const targetsData: TargetData[] = [];

        if (targetsResult.type === 'monthly' && targetsResult.subDocs) {
            targetsResult.subDocs.forEach(doc => {
                const data = doc.data();
                let collectedAmount = data.amountCollected || 0;

                if (hasPaymentData) {
                    const userIdentifiers = [data.userId, data.userName, doc.id].filter(Boolean);
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
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
        } else if (targetsResult.type === 'legacy' && targetsResult.docs) {
            targetsResult.docs.forEach(doc => {
                const data = doc.data();
                if (data.month && data.year) return; // Skip monthly docs

                let collectedAmount = data.amountCollected || 0;
                if (hasPaymentData) {
                    const userIdentifiers = [data.userId, data.userName, doc.id].filter(Boolean);
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
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
        console.timeEnd('getAdminDashboardData:ProcessTargets');

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

        // Optimizing Target Fetching: 
        // Previously we fetched parent docs 'targets/{Month_Year}' and read 'total' or 'amountCollectedTarget'.
        // However, the source of truth is the 'sales_targets' subcollection which might not be synced to the parent 'total'.
        // To fix the "0 target" bug and ensure consistency with the top dashboard cards, 
        // we must aggregate the subcollections directly.

        console.time('getDashboardHistory:Targets');
        // Use collectionGroup to fetch ALL sales_targets from ALL months
        // This is reasonably efficient as we want the global history.
        const salesTargetsSnap = await db.collectionGroup('sales_targets').get();
        console.timeEnd('getDashboardHistory:Targets');

        const targetsByMonth: { [key: string]: number } = {};

        salesTargetsSnap.forEach(doc => {
            // Path structure: targets/{Month_Year}/sales_targets/{userId}
            // We want {Month_Year} which is the ID of the parent document of the collection.
            const monthDocRef = doc.ref.parent.parent;

            if (monthDocRef) {
                const monthKey = monthDocRef.id;

                // Ensure it's a valid month key (e.g., "Jan_2025")
                if (monthKey.includes('_')) {
                    const data = doc.data();
                    const targetAmount = data.amountCollectedTarget || 0;

                    targetsByMonth[monthKey] = (targetsByMonth[monthKey] || 0) + targetAmount;

                    // CRITICAL FIX: Add this month to allMonthsSet
                    // This ensures that even if there are NO payments for a month (e.g. future month),
                    // it still appears in the chart with the correct target.
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
