import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

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

            // Meta CAPI Trigger Logic
            if (status === 'Converted' || status === 'Qualified') {
                const { testEventCode } = payload
                // We need to fetch lead data to check source and get contact info
                // This is done outside the batch update loop for efficiency
                const triggerCapi = async () => {
                    try {
                        const leadSnaps = await Promise.all(leadIds.map(id => leadsRef.doc(id).get()))

                        for (const snap of leadSnaps) {
                            if (!snap.exists) continue

                            const data = snap.data()
                            if (!data) continue

                            const source = (data.source || "").toLowerCase().trim()
                            // Check if source is credsettle (handling variations)
                            if (source.includes("credsettle")) {
                                const email = String(data.email || "")
                                const phone = String(data.phone || data.mobile || data.number || "")

                                if (email || phone) {
                                    console.log(`[CAPI] Triggering for lead ${snap.id} (Source: ${source}) with testEventCode: ${testEventCode}`)

                                    // Fire and forget the fetch to avoid blocking the response
                                    fetch("https://www.credsettle.com/api/meta/capi", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            email: email,
                                            phone: phone,
                                            eventName: 'LeadQualified',
                                            status: status,
                                            leadId: snap.id,
                                            testEventCode: testEventCode
                                        })
                                    }).then(async res => {
                                        const resText = await res.text()
                                        if (!res.ok) {
                                            console.error(`[CAPI ERROR] Failed for ${snap.id}: ${res.status} ${res.statusText} - ${resText}`)
                                        } else {
                                            console.log(`[CAPI SUCCESS] Sent for ${snap.id}: ${res.status} - ${resText}`)
                                        }
                                    }).catch(err => {
                                        console.error(`[CAPI ERROR] Fetch failed for ${snap.id}:`, err)
                                    })
                                } else {
                                    console.log(`[CAPI SKIP] Lead ${snap.id} has no email or phone`)
                                }
                            } else {
                                console.log(`[CAPI SKIP] Lead ${snap.id} source is not credsettle: "${source}"`)
                            }
                        }
                    } catch (err) {
                        console.error("[CAPI ERROR] Error in trigger logic:", err)
                    }
                }

                // Execute trigger logic
                triggerCapi()
            }
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
