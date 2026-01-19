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

                // Let's search by the exact Wati ID first.
                let leadsSnap = await adminDb.collection("ama_leads")
                    .where("mobile", "==", senderPhone)
                    .limit(1)
                    .get();

                if (leadsSnap.empty) {
                    // Try without 91 if it starts with it
                    if (senderPhone.startsWith("91")) {
                        const rawPhone = senderPhone.substring(2);
                        leadsSnap = await adminDb.collection("ama_leads")
                            .where("mobile", "==", rawPhone)
                            .limit(1)
                            .get();
                    }
                }

                // Try searching in 'phone' field as fallback
                if (leadsSnap.empty) {
                    leadsSnap = await adminDb.collection("ama_leads")
                        .where("phone", "==", senderPhone)
                        .limit(1)
                        .get();
                }

                if (!leadsSnap.empty) {
                    const leadDoc = leadsSnap.docs[0];
                    const leadId = leadDoc.id;

                    await adminDb.collection("ama_leads").doc(leadId).update({
                        status: "Retargeting",
                        synced_at: FieldValue.serverTimestamp(), // Bump to top
                        lastModified: FieldValue.serverTimestamp(),
                    });

                    // Add system note
                    await adminDb.collection("ama_leads").doc(leadId).collection("history").add({
                        content: `Auto-moved to Retargeting via Wati interest response ("${text}")`,
                        createdAt: FieldValue.serverTimestamp(),
                        createdBy: "System (Wati Webhook)",
                        type: "system"
                    });

                    console.log(`[WATI_WEBHOOK] Updated lead ${leadId} to Retargeting`);
                } else {
                    console.log(`[WATI_WEBHOOK] Lead not found for phone ${senderPhone}`);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WATI_WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
