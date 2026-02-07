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
export interface WeeklyHistoryData {
    month: string;
    year: number;
    fullLabel: string;
    weeks: {
        week1: number; // Days 1-7
        week2: number; // Days 8-14
        week3: number; // Days 15-21
        week4: number; // Days 22-End
    };
    total: number;
    type: 'sales' | 'ops';
}

export async function getWeeklyRevenueHistory(): Promise<{ sales: WeeklyHistoryData[], ops: WeeklyHistoryData[] }> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Define relevant months (e.g., last 6 months to avoid fetching too much data if possible, 
        // but for now we'll fetch all and filter in memory or just process all since we need history)
        // For performance, we could limit to last 12 months. Let's process all for now as requested "history".

        // --- Helper to process payments into weekly buckets ---
        const processRefIntoWeeks = async (query: FirebaseFirestore.Query, type: 'sales' | 'ops'): Promise<WeeklyHistoryData[]> => {
            const snapshot = await query.get();
            const monthlyData: { [key: string]: WeeklyHistoryData } = {};

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.timestamp) return;

                let date: Date;
                if (typeof data.timestamp === 'string') {
                    date = new Date(data.timestamp);
                } else if (data.timestamp.toDate) {
                    date = data.timestamp.toDate();
                } else if (data.timestamp._seconds) {
                    date = new Date(data.timestamp._seconds * 1000);
                } else {
                    date = new Date(data.timestamp);
                }

                if (isNaN(date.getTime())) return;

                const monthIndex = date.getMonth();
                const year = date.getFullYear();
                const day = date.getDate();
                const monthName = monthNames[monthIndex];
                const key = `${monthName}_${year}`;

                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        month: monthName,
                        year: year,
                        fullLabel: `${monthName} ${year}`,
                        weeks: { week1: 0, week2: 0, week3: 0, week4: 0 },
                        total: 0,
                        type: type
                    };
                }

                const amount = parseFloat(data.amount) || 0;
                monthlyData[key].total += amount;

                // Determine week (4 weeks logic)
                if (day <= 7) monthlyData[key].weeks.week1 += amount;
                else if (day <= 14) monthlyData[key].weeks.week2 += amount;
                else if (day <= 21) monthlyData[key].weeks.week3 += amount;
                else monthlyData[key].weeks.week4 += amount; // All remaining days in Week 4
            });

            // Convert map to sorted array
            return Object.values(monthlyData).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
            });
        };

        // 1. Fetch Sales Revenue (All approved payments)
        const salesPromise = processRefIntoWeeks(
            db.collection('payments').where('status', '==', 'approved'),
            'sales'
        );

        // 2. Fetch Ops Revenue (All approved ops_payments)
        const opsPromise = processRefIntoWeeks(
            db.collection('ops_payments').where('status', '==', 'approved'),
            'ops'
        );

        const [salesData, opsData] = await Promise.all([salesPromise, opsPromise]);

        return {
            sales: salesData,
            ops: opsData
        };

    } catch (error) {
        console.error('Error fetching weekly revenue history:', error);
        return { sales: [], ops: [] };
    }
}
// ... (interfaces)

export interface SourceAnalyticsData {
    source: string;
    leadsCount: number;
    revenue: number;
    valuation: number; // Revenue / Leads
}

// ... (previous code)

export interface SourceAnalyticsData {
    source: string;
    leadsCount: number;
    revenue: number;
    valuation: number; // Revenue / Leads
}

export async function getSourceAnalyticsData(month: string, year: number): Promise<SourceAnalyticsData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);

        if (monthIndex === -1) throw new Error('Invalid month');

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        // ISO Strings for string-based timestamp comparison
        const startISO = startOfMonth.toISOString();
        const endISO = endOfMonth.toISOString();

        const analyticsData: SourceAnalyticsData[] = [];
        const leadsBySource: Record<string, number> = {};

        // Helper to normalize source names
        const normalizeSource = (source: string): string => {
            if (!source) return 'Unknown';
            const lower = source.toLowerCase().trim();
            if (lower === 'billcut') return 'BillCut';
            if (lower === 'ama') return 'AMA';
            if (lower === 'credsettle' || lower === 'credsettlee') return 'CredSettle';
            if (lower === 'settleloans' || lower === 'settleloans contact') return 'SettleLoans';
            return source; // Return original if no match, or capitalize? Let's keep original for now unless specific
        };

        // 1. Fetch AMA LEADS
        try {
            const amaLeadsRef = db.collection('ama_leads');
            const amaLeadsSnap = await amaLeadsRef
                .where('date', '>=', startOfMonth.getTime())
                .where('date', '<=', endOfMonth.getTime())
                .get();

            amaLeadsSnap.forEach(doc => {
                const data = doc.data();
                const rawSource = data.source || 'AMA';
                const source = normalizeSource(rawSource);
                leadsBySource[source] = (leadsBySource[source] || 0) + 1;
            });
        } catch (e) {
            console.error('Error fetching ama_leads:', e);
        }

        // 2. Fetch BILLCUT LEADS
        try {
            const billcutLeadsRef = db.collection('billcutLeads');
            const billcutLeadsSnap = await billcutLeadsRef
                .where('date', '>=', startOfMonth.getTime())
                .where('date', '<=', endOfMonth.getTime())
                .get();

            billcutLeadsSnap.forEach(doc => {
                const source = 'BillCut';
                leadsBySource[source] = (leadsBySource[source] || 0) + 1;
            });
        } catch (e) {
            console.error('Error fetching billcutLeads:', e);
        }


        // 3. Fetch PAYMENTS (Sales)
        const paymentsRef = db.collection('payments');
        const paymentsSnap = await paymentsRef
            .where('status', '==', 'approved')
            .where('timestamp', '>=', startISO)
            .where('timestamp', '<=', endISO)
            .get();

        const revenueBySource: Record<string, number> = {};
        const paymentEmails: Set<string> = new Set();
        const paymentsMap: Record<string, number> = {}; // email -> amount sum (for those without source)

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const amount = parseFloat(data.amount) || 0;

            // Check if source is directly available
            if (data.source) {
                const source = normalizeSource(data.source);
                revenueBySource[source] = (revenueBySource[source] || 0) + amount;
            } else {
                // If no source, fall back to email lookup
                const email = data.email || data.clientEmail || data.userEmail || data.payerEmail;
                if (email) {
                    paymentEmails.add(email);
                    paymentsMap[email] = (paymentsMap[email] || 0) + amount;
                }
            }
        });

        // 4. Resolve Sources for Payments MISSING source
        if (paymentEmails.size > 0) {
            const emailsArray = Array.from(paymentEmails);
            const chunkSize = 10;
            const matchedSources: Record<string, string> = {}; // email -> source

            for (let i = 0; i < emailsArray.length; i += chunkSize) {
                const chunk = emailsArray.slice(i, i + chunkSize);
                if (chunk.length === 0) continue;

                // Check AMA Leads
                const amaCheckSnap = await db.collection('ama_leads')
                    .where('email', 'in', chunk)
                    .get();

                amaCheckSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.email) {
                        matchedSources[data.email] = data.source || 'AMA';
                    }
                });

                // Check BillCut Leads (if not found in AMA)
                // Filter out emails already found
                const remainingChunk = chunk.filter(email => !matchedSources[email]);
                if (remainingChunk.length > 0) {
                    const billcutCheckSnap = await db.collection('billcutLeads')
                        .where('email', 'in', remainingChunk)
                        .get();

                    billcutCheckSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.email) {
                            matchedSources[data.email] = 'BillCut';
                        }
                    });
                }
            }

            // Aggregate Revenue for resolved emails
            for (const [email, amount] of Object.entries(paymentsMap)) {
                const source = matchedSources[email] || 'Unknown';
                revenueBySource[source] = (revenueBySource[source] || 0) + amount;
            }
        }

        // 5. Combine Data
        const allSources = new Set([...Object.keys(leadsBySource), ...Object.keys(revenueBySource)]);

        allSources.forEach(source => {
            const leadsCount = leadsBySource[source] || 0;
            const revenue = revenueBySource[source] || 0;
            const valuation = leadsCount > 0 ? revenue / leadsCount : 0;

            analyticsData.push({
                source,
                leadsCount,
                revenue,
                valuation
            });
        });

        // Sort by Revenue descending
        return analyticsData.sort((a, b) => b.revenue - a.revenue);

    } catch (error) {
        console.error('Error fetching source analytics:', error);
        return [];
    }
}
