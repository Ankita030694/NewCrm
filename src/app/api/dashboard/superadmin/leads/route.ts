import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        const selectedLeadsSalesperson = searchParams.get("selectedLeadsSalesperson");
        const isFilterApplied = searchParams.get("isFilterApplied") === "true";

        // --- 1. Fetch ama_leads ---
        let leadsQuery: FirebaseFirestore.Query = adminDb.collection("ama_leads");

        if (isFilterApplied && (startDateParam || endDateParam)) {
            if (startDateParam) {
                const start = new Date(startDateParam);
                // Adjust for timezone if necessary, or assume input is correct date string
                // Using simple date comparison as per original client logic
                leadsQuery = leadsQuery.where("synced_at", ">=", Timestamp.fromDate(start));
            }
            if (endDateParam) {
                const end = new Date(`${endDateParam}T23:59:59`);
                leadsQuery = leadsQuery.where("synced_at", "<=", Timestamp.fromDate(end));
            }
        }

        if (selectedLeadsSalesperson && selectedLeadsSalesperson !== "all") {
            leadsQuery = leadsQuery.where("assignedTo", "==", selectedLeadsSalesperson);
        }

        const leadsSnapshot = await leadsQuery.get();

        // --- 2. Fetch billcutLeads ---
        let billcutQuery: FirebaseFirestore.Query = adminDb.collection("billcutLeads");

        if (isFilterApplied && (startDateParam || endDateParam)) {
            if (startDateParam) {
                const start = new Date(startDateParam);
                billcutQuery = billcutQuery.where("synced_date", ">=", Timestamp.fromDate(start));
            }
            if (endDateParam) {
                const end = new Date(`${endDateParam}T23:59:59`);
                billcutQuery = billcutQuery.where("synced_date", "<=", Timestamp.fromDate(end));
            }
        }

        if (selectedLeadsSalesperson && selectedLeadsSalesperson !== "all") {
            billcutQuery = billcutQuery.where("assigned_to", "==", selectedLeadsSalesperson);
        }

        const billcutSnapshot = await billcutQuery.get();

        // --- 3. Process Data ---
        const sourceTotalCounts = {
            settleloans: 0,
            credsettlee: 0,
            ama: 0,
            billcut: 0,
        };

        const statusCounts: Record<string, { settleloans: number; credsettlee: number; ama: number; billcut: number }> = {
            'Interested': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Not Interested': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Not Answering': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Callback': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Converted': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Loan Required': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Short Loan': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Cibil Issue': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Closed Lead': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Language Barrier': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'Future Potential': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
            'No Status': { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 },
        };

        // Process crm_leads
        leadsSnapshot.forEach((doc) => {
            const lead = doc.data();
            let source = lead.source_database;

            if (source) {
                source = source.toLowerCase();
                let mappedSource: keyof typeof sourceTotalCounts | undefined;

                if (source.includes('settleloans')) {
                    mappedSource = 'settleloans';
                } else if (source.includes('credsettlee') || source.includes('credsettle')) {
                    mappedSource = 'credsettlee';
                } else if (source.includes('ama')) {
                    mappedSource = 'ama';
                }

                if (mappedSource) {
                    sourceTotalCounts[mappedSource]++;

                    const status = lead.status;
                    if (status && statusCounts[status]) {
                        statusCounts[status][mappedSource]++;
                    } else {
                        statusCounts['No Status'][mappedSource]++;
                    }
                }
            }
        });

        // Process billcutLeads
        billcutSnapshot.forEach((doc) => {
            const lead = doc.data();
            sourceTotalCounts.billcut++;

            const category = lead.category;
            if (category && statusCounts[category]) {
                statusCounts[category].billcut++;
            } else {
                statusCounts['No Status'].billcut++;
            }
        });

        // Prepare chart data
        const statusColors = [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)',
            'rgba(40, 159, 64, 0.6)',
            'rgba(210, 99, 132, 0.6)',
            'rgba(100, 206, 86, 0.6)',
            'rgba(150, 162, 235, 0.6)',
        ];

        const datasets = Object.entries(statusCounts).map(([status, sources], index) => {
            return {
                label: status,
                data: [sources.settleloans, sources.credsettlee, sources.ama, sources.billcut],
                backgroundColor: statusColors[index % statusColors.length],
            };
        });

        const leadsBySourceData = {
            labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
            datasets,
        };

        return NextResponse.json({
            leadsBySourceData,
            sourceTotals: sourceTotalCounts,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });

    } catch (error) {
        console.error("Error fetching superadmin leads data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
