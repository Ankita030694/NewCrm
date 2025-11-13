import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Email history endpoint called');
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '30');
    const searchTerm = searchParams.get('search') || '';
    
    console.log('[API] Params:', { page, pageSize, searchTerm });
    console.log('[API] Attempting to query Firestore...');
    
    // Build the base query using Admin SDK
    let emailHistoryQuery = db.collection("emailHistory")
      .orderBy("sentAt", "desc")
      .limit(pageSize + 1); // Fetch one extra to determine if there are more pages
    
    console.log('[API] Query built, fetching documents...');
    const snapshot = await emailHistoryQuery.get();
    console.log('[API] Snapshot received, document count:', snapshot.size);
    const allDocs = snapshot.docs;
    const historyData: any[] = [];
    let hasMore = false;
    
    console.log(`Total documents fetched: ${allDocs.length}`);
    
    // Check if we have more pages
    if (allDocs.length > pageSize) {
      hasMore = true;
    }
    
    // Process only up to pageSize documents
    const docsToProcess = allDocs.slice(0, pageSize);
    
    let filteredCount = 0;
    for (const doc of docsToProcess) {
      const data = doc.data();
      
      console.log(`[API] Processing doc ${doc.id}:`, {
        hasLeadId: !!data.leadId,
        emailType: data.emailType,
        subject: data.subject?.substring(0, 50)
      });
      
      // Only filter out agreement type emails (keep all other emails including lead-based ones)
      const isAgreementType = data.emailType === "agreement";
      
      if (isAgreementType) {
        filteredCount++;
        console.log(`[API] ❌ Filtered out agreement email: emailType=${data.emailType}`);
        continue; // Skip this document
      }
      
      // This document passes the filter
      console.log(`[API] ✓ Document passes filter`);
      
      // Apply search filter if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSubject = data.subject?.toLowerCase().includes(searchLower);
        const matchesRecipient = data.recipients?.some((r: any) => 
          r.email?.toLowerCase().includes(searchLower) || 
          r.name?.toLowerCase().includes(searchLower)
        );
        const matchesLeadEmail = data.leadEmail?.toLowerCase().includes(searchLower);
        const matchesLeadName = data.leadName?.toLowerCase().includes(searchLower);
        
        if (matchesSubject || matchesRecipient || matchesLeadEmail || matchesLeadName) {
          historyData.push({
            id: doc.id,
            ...data,
            sentAt: data.sentAt?.toDate().toISOString() || null,
          });
        } else {
          console.log(`[API] ❌ Does not match search term: "${searchTerm}"`);
        }
      } else {
        // No search term, include this document
        historyData.push({
          id: doc.id,
          ...data,
          sentAt: data.sentAt?.toDate().toISOString() || null,
        });
        console.log(`[API] ✓ Added to results`);
      }
    }
    
    console.log(`Filtered out ${filteredCount} documents, returning ${historyData.length} documents`);
    
    // Calculate pagination metadata
    const totalPages = hasMore ? page + 1 : page; // Simplified - we know there's at least one more page if hasMore
    
    return NextResponse.json({
      success: true,
      data: historyData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        hasMore: hasMore,
        totalRecords: historyData.length,
      }
    });
    
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to load email history. Please try again later." 
      },
      { status: 500 }
    );
  }
}

