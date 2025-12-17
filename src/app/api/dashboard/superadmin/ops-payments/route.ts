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

        const targetMonth = selectedAnalyticsMonth ? parseInt(selectedAnalyticsMonth) : currentMonth;
        const targetYear = selectedAnalyticsYear ? parseInt(selectedAnalyticsYear) : currentYear;

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

        let opsPaymentsQuery: FirebaseFirestore.Query = adminDb.collection("ops_payments");

        if (selectedSalesperson) {
            opsPaymentsQuery = opsPaymentsQuery.where("submittedBy", "==", selectedSalesperson);
        }

        const opsPaymentsSnapshot = await opsPaymentsQuery.get();

        const analytics = {
            totalApprovedAmount: 0,
            totalPendingAmount: 0,
            totalRejectedAmount: 0,
            approvedCount: 0,
            pendingCount: 0,
            rejectedCount: 0,
            totalCount: 0
        };

        opsPaymentsSnapshot.forEach((doc) => {
            const payment = doc.data();
            const amount = parseFloat(payment.amount) || 0;

            // Apply date filter (server-side filtering in memory for date range on string timestamp)
            // Assuming timestamp is ISO string or similar that can be parsed
            if (payment.timestamp) {
                const paymentDate = new Date(payment.timestamp);
                if (paymentDate < startOfMonth || paymentDate > endOfMonth) {
                    return; // Skip
                }
            }

            analytics.totalCount++;

            switch (payment.status) {
                case 'approved':
                    analytics.totalApprovedAmount += amount;
                    analytics.approvedCount++;
                    break;
                case 'pending':
                    analytics.totalPendingAmount += amount;
                    analytics.pendingCount++;
                    break;
                case 'rejected':
                    analytics.totalRejectedAmount += amount;
                    analytics.rejectedCount++;
                    break;
            }
        });

        return NextResponse.json(analytics, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error("Error fetching superadmin ops payments analytics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
