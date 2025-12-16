import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, leadIds, payload } = body

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 })
        }

        const batch = adminDb.batch()
        const leadsRef = adminDb.collection("ama_leads")

        // Process based on action type
        if (action === "assign") {
            const { assignedTo, assignedToId } = payload
            if (!assignedTo || !assignedToId) {
                return NextResponse.json({ error: "Missing assignment details" }, { status: 400 })
            }

            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    assignedTo,
                    assignedToId,
                    assigned_to: assignedTo, // Update snake_case field
                    assigned_to_id: assignedToId, // Update snake_case field
                    assignedAt: FieldValue.serverTimestamp(),
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else if (action === "unassign") {
            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    assignedTo: FieldValue.delete(),
                    assignedToId: FieldValue.delete(),
                    assigned_to: FieldValue.delete(), // Delete snake_case field
                    assigned_to_id: FieldValue.delete(), // Delete snake_case field
                    assignedAt: FieldValue.delete(),
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else if (action === "update_status") {
            const { status } = payload
            if (!status) {
                return NextResponse.json({ error: "Missing status" }, { status: 400 })
            }

            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                const updateData: any = {
                    status,
                    lastModified: FieldValue.serverTimestamp(),
                }

                // Add specific timestamps based on status
                if (status === 'Converted') {
                    updateData.convertedAt = FieldValue.serverTimestamp()
                    updateData.convertedToClient = true
                } else {
                    // If status is NOT Converted, remove the converted flags/timestamps
                    // This ensures the tick mark is removed if status changes from Converted to something else
                    updateData.convertedAt = FieldValue.delete()
                    updateData.convertedToClient = FieldValue.delete()
                }

                // Handle Language Barrier
                if (status === 'Language Barrier' && payload.language) {
                    updateData.language = payload.language
                }

                batch.update(docRef, updateData)
            })
        } else if (action === "update_notes") {
            const { salesNotes } = payload
            // Allow empty string to clear notes
            if (salesNotes === undefined) {
                return NextResponse.json({ error: "Missing salesNotes" }, { status: 400 })
            }

            leadIds.forEach((id) => {
                const docRef = leadsRef.doc(id)
                batch.update(docRef, {
                    salesNotes,
                    lastModified: FieldValue.serverTimestamp(),
                })
            })
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Commit the batch
        await batch.commit()

        return NextResponse.json({ success: true, count: leadIds.length })
    } catch (error) {
        console.error("Error performing lead action:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
