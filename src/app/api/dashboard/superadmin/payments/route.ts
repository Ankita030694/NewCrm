import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }
    const db = adminDb;

    try {
        const paymentsCollection = db.collection("clients_payments");
        // Limit to 50 as per original logic to avoid timeout, or increase if server can handle it.
        // Keeping it 50 for now to match "fast initial load" logic, but server could potentially do more.
        // Let's try 100 on server.
        const paymentsSnapshot = await paymentsCollection.limit(100).get();

        const analytics = {
            totalPaymentsAmount: 0,
            totalPaidAmount: 0,
            totalPendingAmount: 0,
            clientCount: 0,
            paymentMethodDistribution: {} as Record<string, number>,
            monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
            paymentTypeDistribution: {
                full: 0,
                partial: 0
            }
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

        let currentMonthCollected = 0;
        let currentMonthPending = 0;

        const clientIds: string[] = [];

        paymentsSnapshot.forEach((clientDoc) => {
            const clientPayment = clientDoc.data();
            clientIds.push(clientDoc.id);

            analytics.clientCount++;
            analytics.totalPaymentsAmount += clientPayment.totalPaymentAmount || 0;
            analytics.totalPaidAmount += clientPayment.paidAmount || 0;
            analytics.totalPendingAmount += clientPayment.pendingAmount || 0;

            const monthlyFees = clientPayment.monthlyFees || 0;

            if (clientPayment.startDate) {
                let startDate: Date;
                if (clientPayment.startDate.toDate) {
                    startDate = clientPayment.startDate.toDate();
                } else {
                    startDate = new Date(clientPayment.startDate);
                }

                if (startDate <= currentMonthEnd) {
                    currentMonthPending += monthlyFees;
                }
            }

            if (clientPayment.paymentsCompleted > 0) {
                if (clientPayment.paidAmount < monthlyFees) {
                    analytics.paymentTypeDistribution.partial++;
                } else {
                    analytics.paymentTypeDistribution.full++;
                }
            }
        });

        // Process payment history for a subset of clients
        const maxClientsToProcess = Math.min(clientIds.length, 20); // Increased from 10 to 20 on server

        // Parallelize subcollection fetches
        const historyPromises = clientIds.slice(0, maxClientsToProcess).map(async (clientId) => {
            const paymentHistoryRef = db.collection(`clients_payments/${clientId}/payment_history`);
            const historySnapshot = await paymentHistoryRef
                .where('payment_status', 'in', ['approved', 'Approved'])
                .limit(5)
                .get();

            historySnapshot.forEach((paymentDoc) => {
                const payment = paymentDoc.data();
                currentMonthCollected += payment.requestedAmount || 0;

                // Logic to check if payment is in current month (simplified from original)
                // Original logic checked paymentDate, dateApproved, requestDate, monthNumber
                // We'll replicate the check for paymentDate/dateApproved/requestDate
                let isCurrentMonth = false;
                let dateToCheck: Date | null = null;

                if (payment.paymentDate) {
                    dateToCheck = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
                } else if (payment.dateApproved) {
                    dateToCheck = payment.dateApproved.toDate ? payment.dateApproved.toDate() : new Date(payment.dateApproved);
                } else if (payment.requestDate) {
                    dateToCheck = payment.requestDate.toDate ? payment.requestDate.toDate() : new Date(payment.requestDate);
                }

                if (dateToCheck && dateToCheck >= currentMonthStart && dateToCheck <= currentMonthEnd) {
                    isCurrentMonth = true;
                } else if (payment.monthNumber === currentMonth + 1) {
                    isCurrentMonth = true;
                }
            });
        });

        await Promise.all(historyPromises);

        currentMonthPending = Math.max(0, currentMonthPending - currentMonthCollected);

        const completionRate = analytics.totalPaymentsAmount > 0
            ? Math.round((analytics.totalPaidAmount / analytics.totalPaymentsAmount) * 100)
            : 0;

        const finalPaymentAnalytics = {
            ...analytics,
            completionRate
        };

        const finalCurrentMonthPayments = {
            collected: currentMonthCollected,
            pending: currentMonthPending
        };

        return NextResponse.json({
            paymentAnalytics: finalPaymentAnalytics,
            currentMonthPayments: finalCurrentMonthPayments
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error("Error fetching superadmin payment analytics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
