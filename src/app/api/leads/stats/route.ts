import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get("status")
        const source = searchParams.get("source")
        const salespersonId = searchParams.get("salespersonId")
        const tab = searchParams.get("tab") || "all"

        // Base collection reference
        const baseRef = adminDb.collection("ama_leads")

        // Helper to apply common filters
        const applyFilters = (query: FirebaseFirestore.Query) => {
            if (status && status !== "all") query = query.where("status", "==", status)
            if (source && source !== "all") query = query.where("source", "==", source)
            if (salespersonId && salespersonId !== "all") query = query.where("assignedToId", "==", salespersonId)
            return query
        }

        // 1. Total Count (matching current filters)
        let totalQuery = applyFilters(baseRef)

        // Apply tab logic to total count if needed, but usually "Total" means "All leads matching filters"
        // If we are in "Callback" tab, the total count shown should probably be the callback count?
        // Usually, the UI shows "Total Leads: X" (global) and then counts for tabs.
        // Let's return specific counts for tabs regardless of current selection, 
        // AND a "filtered" count for the current view.

        // A. Global Stats (ignoring current filters, but maybe respecting salesperson filter if user is sales?)
        // For now, we'll return raw counts for tabs.

        const callbackQuery = baseRef.where("status", "==", "Callback")

        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)
        const todayQuery = baseRef
            .where("synced_at", ">=", Timestamp.fromDate(startOfDay))
            .where("synced_at", "<=", Timestamp.fromDate(endOfDay))

        // Execute aggregations in parallel
        const [totalSnap, callbackSnap, todaySnap] = await Promise.all([
            applyFilters(baseRef).count().get(), // Count matching *current* filters
            callbackQuery.count().get(),         // Total callbacks (global)
            todayQuery.count().get()             // Total today (global)
        ])

        return NextResponse.json({
            total: totalSnap.data().count,
            callback: callbackSnap.data().count,
            today: todaySnap.data().count
        })

    } catch (error) {
        console.error("Error fetching lead stats:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
