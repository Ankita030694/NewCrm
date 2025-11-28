import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/ama_app';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getCountFromServer,
  where
} from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastCreatedAtParam = searchParams.get('lastCreatedAt');
    const lastIdParam = searchParams.get('lastId');
    const searchQuery = searchParams.get('search');

    const collectionRef = collection(db, 'leads');
    let q;
    let total = 0;

    // If search query is present, we'll search by phone number or name
    // Note: Firestore doesn't support full-text search natively. 
    // We'll implement a basic prefix search for phone and exact match for name/email if needed
    // For a production app with large dataset, consider Algolia or ElasticSearch
    
    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();
      
      // Try searching by phone first
      // This is a simple implementation. A more robust one would use a dedicated search service.
      // We can't easily combine multiple OR conditions with different fields in Firestore in a single query 
      // without complex index setup or multiple queries.
      // Prioritizing Phone Number search as it's most unique
      
      if (/^\d+$/.test(trimmedQuery)) {
        // It's a number, search by phone
        q = query(
           collectionRef,
           where('phone', '>=', trimmedQuery),
           where('phone', '<=', trimmedQuery + '\uf8ff'),
           limit(limitParam)
        );
      } else {
        // Search by name (case-sensitive unfortunately in standard Firestore)
        // We'll try to match name
        q = query(
           collectionRef,
           where('name', '>=', trimmedQuery),
           where('name', '<=', trimmedQuery + '\uf8ff'),
           limit(limitParam)
        );
      }

      // Count for search results is harder to get efficiently without reading all, 
      // so we might skip total count for search or do a separate count query if critical.
      // For now, we'll just get the docs.
      
    } else {
      // Default pagination logic
       // Get total count only for default view
      const countSnapshot = await getCountFromServer(collectionRef);
      total = countSnapshot.data().count;

      q = query(
        collectionRef, 
        orderBy('created_at', 'desc'),
        orderBy('__name__', 'desc'), 
        limit(limitParam)
      );

      if (lastCreatedAtParam && lastIdParam) {
        const lastCreatedAt = parseInt(lastCreatedAtParam);
        if (!isNaN(lastCreatedAt)) {
          q = query(
            collectionRef, 
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc'),
            startAfter(lastCreatedAt, lastIdParam),
            limit(limitParam)
          );
        }
      }
    }

    const snapshot = await getDocs(q);
    
    const leads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            created_at: data.created_at,
            email: data.email,
            name: data.name,
            phone: data.phone,
            query: data.query,
            source: data.source,
            state: data.state
        };
    });

    return NextResponse.json({
      leads,
      total: searchQuery ? leads.length : total, // Approximate total for search
      hasMore: leads.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching app leads:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
