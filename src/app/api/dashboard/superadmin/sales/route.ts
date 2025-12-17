import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const selectedAnalyticsMonth = searchParams.get("month");
        const selectedAnalyticsYear = searchParams.get("year");
        const selectedSalesperson = searchParams.get("salesperson");

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const targetMonth = selectedAnalyticsMonth ? parseInt(selectedAnalyticsMonth) : currentMonth;
        const targetYear = selectedAnalyticsYear ? parseInt(selectedAnalyticsYear) : currentYear;
        const targetMonthName = monthNames[targetMonth];

        // --- 1. Fetch Salespeople ---
        const usersRef = adminDb.collection("users");
        const usersSnapshot = await usersRef.where("role", "==", "sales").get();

        const salespeople: { id: string; name: string }[] = [];
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const userStatus = userData.status;
            const isActive = userStatus === 'active' || userStatus === undefined || userStatus === null;

            if (fullName && isActive) {
                salespeople.push({ id: doc.id, name: fullName });
            }
        });
        salespeople.sort((a, b) => a.name.localeCompare(b.name));

        // --- 2. Fetch Sales Analytics ---
        let totalTarget = 0;
        let totalCollected = 0;
        let paymentBasedRevenue = 0;
        let hasPaymentData = false;

        // Try to get revenue from payments collection
        try {
            const startOfMonth = new Date(targetYear, targetMonth, 1);
            const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

            const paymentsSnapshot = await adminDb.collection("payments").get();

            paymentsSnapshot.forEach((doc) => {
                const payment = doc.data();
                if (payment.status === 'approved' && payment.timestamp) {
                    // Handle timestamp if it's a Firestore Timestamp or string
                    let paymentDate: Date;
                    if (payment.timestamp.toDate) {
                        paymentDate = payment.timestamp.toDate();
                    } else {
                        paymentDate = new Date(payment.timestamp);
                    }

                    if (paymentDate >= startOfMonth && paymentDate <= endOfMonth) {
                        const amount = parseFloat(payment.amount) || 0;
                        paymentBasedRevenue += amount;
                        hasPaymentData = true;
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching payments for sales analytics:", error);
        }

        // Fetch targets and sales data
        const monthYearName = `${targetMonthName}_${targetYear}`;
        const salesTargetsRef = adminDb.collection(`targets/${monthYearName}/sales_targets`);
        const salesTargetsSnapshot = await salesTargetsRef.get();

        salesTargetsSnapshot.forEach((doc) => {
            const targetData = doc.data();
            totalTarget += targetData.amountCollectedTarget || 0;
            if (targetData.amountCollected !== undefined) {
                totalCollected += targetData.amountCollected || 0;
            }
        });

        if (hasPaymentData) {
            totalCollected = paymentBasedRevenue;
        }

        const salesAnalytics = {
            totalTargetAmount: totalTarget,
            totalCollectedAmount: totalCollected,
            monthlyRevenue: [0, 0, 0, 0, 0, 0], // Placeholder as per original hook
            conversionRate: totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0,
            avgDealSize: 0,
        };

        // --- 3. Fetch Individual Sales Data (if selected) ---
        let individualSalesData = null;
        if (selectedSalesperson) {
            let targetUserId = null;
            // Find user ID from name
            const userDoc = salespeople.find(p => p.name === selectedSalesperson);
            if (userDoc) {
                targetUserId = userDoc.id;
            }

            if (targetUserId) {
                const targetDoc = await salesTargetsRef.doc(targetUserId).get();
                if (targetDoc.exists) {
                    const targetData = targetDoc.data()!;
                    individualSalesData = {
                        name: targetData.userName || selectedSalesperson,
                        targetAmount: targetData.amountCollectedTarget || 0,
                        collectedAmount: targetData.amountCollected || 0,
                        conversionRate: targetData.amountCollectedTarget > 0
                            ? Math.round((targetData.amountCollected / targetData.amountCollectedTarget) * 100)
                            : 0,
                        monthlyData: [0, 0, 0, 0, 0, 0]
                    };
                }
            }

            if (!individualSalesData) {
                // Fallback query by userName
                const querySnapshot = await salesTargetsRef.where('userName', '==', selectedSalesperson).get();
                if (!querySnapshot.empty) {
                    const targetData = querySnapshot.docs[0].data();
                    individualSalesData = {
                        name: targetData.userName || selectedSalesperson,
                        targetAmount: targetData.amountCollectedTarget || 0,
                        collectedAmount: targetData.amountCollected || 0,
                        conversionRate: targetData.amountCollectedTarget > 0
                            ? Math.round((targetData.amountCollected / targetData.amountCollectedTarget) * 100)
                            : 0,
                        monthlyData: [0, 0, 0, 0, 0, 0]
                    };
                }
            }
        }

        return NextResponse.json({
            salesAnalytics,
            salespeople,
            individualSalesData
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error("Error fetching superadmin sales data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
