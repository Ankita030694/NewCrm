import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface WatiMessage {
    text?: string;
    content?: string;
    waId?: string;
    senderNumber?: string;
    mobile?: string;
    [key: string]: any;
}

export async function POST(request: NextRequest) {
    if (!adminDb) {
        console.error("[WATI_WEBHOOK] Firebase Admin not initialized");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const db = adminDb; // Local reference to satisfy TypeScript null check

    try {
        const body = await request.json();

        // Basic logging to debug incoming payloads
        console.log("[WATI_WEBHOOK] Received payload:", JSON.stringify(body, null, 2));

        const messages: WatiMessage[] = Array.isArray(body) ? body : [body];

        for (const msg of messages) {
            const text = (msg.text || msg.content || "").toLowerCase().trim();
            const senderPhone = (msg.waId || msg.senderNumber || msg.mobile || "").toString();

            if (!text || !senderPhone) {
                console.log("[WATI_WEBHOOK] Skipping message with missing text or phone");
                continue;
            }

            // Check triggers
            const triggers = ["yes", "ok", "okay"];
            const isInterested = triggers.some(trigger => text.includes(trigger));

            if (isInterested) {
                console.log(`[WATI_WEBHOOK] Detected interest from ${senderPhone}: "${text}"`);

                // --- STRATEGY: Search ama_leads first, then billcutLeads ---

                let leadFound = false;
                let collectionName = "ama_leads";
                let leadId = "";

                // Helper to search a collection
                const findLeadInCollection = async (collName: string) => {
                    // 1. Exact match
                    let snap = await db.collection(collName).where("mobile", "==", senderPhone).limit(1).get();
                    if (!snap.empty) return snap;

                    // 2. Try without 91 prefix
                    if (senderPhone.startsWith("91")) {
                        const rawPhone = senderPhone.substring(2);
                        snap = await db.collection(collName).where("mobile", "==", rawPhone).limit(1).get();
                        if (!snap.empty) return snap;
                    }

                    // 3. Try 'phone' field (mostly for ama_leads, unsure if billcut uses it but harmless)
                    snap = await db.collection(collName).where("phone", "==", senderPhone).limit(1).get();
                    return snap;
                };

                // Search ama_leads
                let matchedSnap = await findLeadInCollection("ama_leads");

                if (!matchedSnap.empty) {
                    leadFound = true;
                    collectionName = "ama_leads";
                    leadId = matchedSnap.docs[0].id;
                } else {
                    // Search billcutLeads
                    matchedSnap = await findLeadInCollection("billcutLeads");
                    if (!matchedSnap.empty) {
                        leadFound = true;
                        collectionName = "billcutLeads";
                        leadId = matchedSnap.docs[0].id;
                    }
                }

                if (leadFound) {
                    const leadData = matchedSnap.docs[0].data();
                    const rawStatus = (collectionName === "ama_leads" ? leadData.status : leadData.category) || "";
                    const normalizedStatus = String(rawStatus).trim().toLowerCase();

                    // Exclude 'Converted' status (case insensitive)
                    if (normalizedStatus === "converted") {
                        console.log(`[WATI_WEBHOOK] SKIP: Lead ${leadId} is '${rawStatus}'. Ignoring automation trigger.`);
                    } else {
                        if (collectionName === "ama_leads") {
                            await db.collection("ama_leads").doc(leadId).update({
                                status: "Retargeting",
                                synced_at: FieldValue.serverTimestamp(),
                                lastModified: FieldValue.serverTimestamp(),
                            });
                        } else {
                            // BillCut Leads Logic
                            // Status field is 'category'
                            // Bump field is 'synced_date' (based on page.tsx logic)
                            await db.collection("billcutLeads").doc(leadId).update({
                                category: "Retargeting",
                                synced_date: FieldValue.serverTimestamp(),
                                lastModified: FieldValue.serverTimestamp(),
                            });
                        }

                        // Add system note
                        await db.collection(collectionName).doc(leadId).collection(collectionName === "billcutLeads" ? "salesNotes" : "history").add({
                            content: `Auto-moved to Retargeting via Wati interest response ("${text}")`,
                            createdAt: FieldValue.serverTimestamp(),
                            createdBy: "System (Wati Webhook)",
                            type: "system"
                        });

                        console.log(`[WATI_WEBHOOK] Updated lead ${leadId} in ${collectionName} to Retargeting`);
                    }
                } else {
                    console.log(`[WATI_WEBHOOK] Lead not found for phone ${senderPhone} in any collection`);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WATI_WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
