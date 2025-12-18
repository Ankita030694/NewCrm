import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    try {
        const clientsRef = adminDb.collection("clients");

        // 1. Optimized Counts (Low Cost)
        const statuses = ['Active', 'Dropped', 'Not Responding', 'On Hold', 'Inactive'];
        const countPromises = [
            clientsRef.count().get(),
            ...statuses.map(status => clientsRef.where('adv_status', '==', status).count().get()),
            ...statuses.map(status => clientsRef.where('status', '==', status).count().get()) // Fallback field
        ];

        const countResults = await Promise.all(countPromises);
        const totalClients = countResults[0].data().count;

        const statusDistribution: Record<string, number> = {
            Active: 0, Dropped: 0, 'Not Responding': 0, 'On Hold': 0, Inactive: 0
        };

        statuses.forEach((status, i) => {
            // Combine counts from both fields (adv_status and status)
            // Note: This is a rough approximation if both fields are used inconsistently
            statusDistribution[status] = countResults[i + 1].data().count + countResults[i + 1 + statuses.length].data().count;
        });

        // 2. Complex Distributions (Currently requires .get() - High Cost)
        // TODO: Move these to a summary document or cloud function aggregation
        const snapshot = await clientsRef.get();
        console.log(`[API DEBUG] Superadmin Clients: Read ${snapshot.size} documents for complex distributions.`);

        const analytics = {
            totalClients: totalClients,
            statusDistribution: statusDistribution,
            advocateCount: {} as Record<string, number>,
            loanTypeDistribution: {} as Record<string, number>,
            sourceDistribution: {} as Record<string, number>,
            cityDistribution: {} as Record<string, number>,
            totalLoanAmount: 0,
            loanCount: 0,
            advocateStatusDistribution: {} as Record<string, Record<string, number>>
        };

        snapshot.forEach((doc) => {
            const client = doc.data();
            const status = client.adv_status || client.status || 'Inactive';

            // Advocate
            const advocate = client.alloc_adv || 'Unassigned';
            analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;

            // Advocate Status Distribution
            if (!analytics.advocateStatusDistribution[advocate]) {
                analytics.advocateStatusDistribution[advocate] = {
                    Active: 0, Dropped: 0, 'Not Responding': 0, 'On Hold': 0, Inactive: 0
                };
            }
            if (analytics.advocateStatusDistribution[advocate][status] !== undefined) {
                analytics.advocateStatusDistribution[advocate][status]++;
            } else {
                analytics.advocateStatusDistribution[advocate][status] = 1;
            }

            // Source
            const source = client.source || 'Unknown';
            analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;

            // City
            const city = client.city || 'Unknown';
            analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;

            // Loan Amount
            let totalClientLoanAmount = 0;
            if (client.creditCardDues) {
                const creditCardDues = typeof client.creditCardDues === 'string'
                    ? parseFloat(client.creditCardDues.replace(/[^0-9.-]+/g, ''))
                    : parseFloat(client.creditCardDues) || 0;
                if (!isNaN(creditCardDues) && creditCardDues > 0) totalClientLoanAmount += creditCardDues;
            }
            if (client.personalLoanDues) {
                const personalLoanDues = typeof client.personalLoanDues === 'string'
                    ? parseFloat(client.personalLoanDues.replace(/[^0-9.-]+/g, ''))
                    : parseFloat(client.personalLoanDues) || 0;
                if (!isNaN(personalLoanDues) && personalLoanDues > 0) totalClientLoanAmount += personalLoanDues;
            }

            if (totalClientLoanAmount > 0) {
                analytics.totalLoanAmount += totalClientLoanAmount;
                analytics.loanCount++;
            }

            // Loan Type
            if (client.banks && Array.isArray(client.banks) && client.banks.length > 0) {
                client.banks.forEach((bank: any) => {
                    const loanType = bank.loanType || 'Unknown';
                    analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
                });
            }
        });

        const avgLoanAmount = analytics.loanCount > 0 ? Math.round(analytics.totalLoanAmount / analytics.loanCount) : 0;
        const advocateEntries = Object.entries(analytics.advocateCount);
        advocateEntries.sort((a, b) => b[1] - a[1]);
        const topAdvocates = advocateEntries.slice(0, 10).map(([name, clientCount]) => ({ name, clientCount }));

        return NextResponse.json({
            totalClients,
            statusDistribution,
            topAdvocates,
            loanTypeDistribution: analytics.loanTypeDistribution,
            sourceDistribution: analytics.sourceDistribution,
            cityDistribution: analytics.cityDistribution,
            totalLoanAmount: analytics.totalLoanAmount,
            avgLoanAmount,
            advocateStatusDistribution: analytics.advocateStatusDistribution
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error("Error fetching superadmin client analytics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
