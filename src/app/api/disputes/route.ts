import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { db } from '@/firebase/ama_app';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    where
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limitParam = parseInt(searchParams.get('limit') || '50');
        const lastSubmittedAtParam = searchParams.get('lastSubmittedAt');
        const lastIdParam = searchParams.get('lastId');
        const searchQuery = searchParams.get('search')?.trim();
        const statusFilter = searchParams.get('status');

        const collectionRef = collection(db, 'file_disputes');
        const snapshot = await getDocs(collectionRef);

        let allDisputes: any[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.disputes && Array.isArray(data.disputes)) {
                data.disputes.forEach((dispute: any, index: number) => {
                    allDisputes.push({
                        ...dispute,
                        parentDocId: doc.id,
                        arrayIndex: index,
                        // Create a unique ID for the dispute since it doesn't have one
                        id: `${doc.id}_${index}`,
                        status: dispute.status || 'No Status',
                        remarks: dispute.remarks || ''
                    });
                });
            }
        });

        // Filter by search query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            allDisputes = allDisputes.filter(d =>
                (d.name && d.name.toLowerCase().includes(lowerQuery)) ||
                (d.phone && d.phone.includes(searchQuery))
            );
        }

        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
            if (statusFilter === 'No Status') {
                allDisputes = allDisputes.filter(d => ['No Status', '', null, undefined].includes(d.status));
            } else {
                allDisputes = allDisputes.filter(d => d.status === statusFilter);
            }
        }

        // Sort by submittedAt desc
        allDisputes.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        const total = allDisputes.length;

        // Implement manual pagination
        let startIndex = 0;
        if (lastSubmittedAtParam && lastIdParam) {
            const lastSubmittedAt = parseInt(lastSubmittedAtParam);
            startIndex = allDisputes.findIndex(d => d.submittedAt === lastSubmittedAt && d.id === lastIdParam) + 1;
        }

        const paginatedDisputes = allDisputes.slice(startIndex, startIndex + limitParam);

        return NextResponse.json({
            disputes: paginatedDisputes,
            total: total,
            hasMore: startIndex + limitParam < total
        });
    } catch (error) {
        console.error('Error fetching disputes:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

import { amaAppDb } from '@/firebase/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(request: NextRequest) {
    if (!amaAppDb) {
        return NextResponse.json({ error: 'AMA App Admin not initialized' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { id, user, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Dispute ID is required' }, { status: 400 });
        }

        // Split id into parentDocId and arrayIndex
        const [parentDocId, indexStr] = id.split('_');
        const arrayIndex = parseInt(indexStr);

        if (isNaN(arrayIndex)) {
            return NextResponse.json({ error: 'Invalid Dispute ID format' }, { status: 400 });
        }

        const docRef = amaAppDb.collection('file_disputes').doc(parentDocId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Parent document not found' }, { status: 404 });
        }

        const data = docSnap.data();
        if (!data || !data.disputes || !data.disputes[arrayIndex]) {
            return NextResponse.json({ error: 'Dispute not found in array' }, { status: 404 });
        }

        const disputes = [...data.disputes];
        const dispute = { ...disputes[arrayIndex], ...updates };
        disputes[arrayIndex] = dispute;

        // Check if remarks were updated for history
        if (updates.remarks !== undefined) {
            // For history, we might want to store it at the parent level or handle it differently
            // Since the child doesn't have its own doc, let's just update the array for now.
            // If the user wants full history modal support, we'd need a sub-collection on the parent
            // that references the array index or a unique field like submittedAt.

            const historyRef = docRef.collection('dispute_history');
            await historyRef.add({
                disputeId: id, // docId_index
                submittedAt: dispute.submittedAt,
                content: updates.remarks,
                createdBy: user?.name || 'Unknown User',
                createdById: user?.uid || '',
                createdAt: FieldValue.serverTimestamp(),
                displayDate: new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                })
            });
        }

        await docRef.update({ disputes });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating dispute:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
