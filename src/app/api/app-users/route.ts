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
  where,
  doc,
  updateDoc
} from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const lastCreatedAtParam = searchParams.get('lastCreatedAt');
    const lastIdParam = searchParams.get('lastId');
    const searchQuery = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    const collectionRef = collection(db, 'login_users');
    let q;
    let total = 0;

    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();

      if (/^\d+$/.test(trimmedQuery)) {
        q = query(
           collectionRef,
           where('phone', '>=', trimmedQuery),
           where('phone', '<=', trimmedQuery + '\uf8ff'),
           limit(limitParam)
        );
      } else if (trimmedQuery.includes('@')) {
          q = query(
           collectionRef,
           where('email', '>=', trimmedQuery),
           where('email', '<=', trimmedQuery + '\uf8ff'),
           limit(limitParam)
        );
      } else {
         q = query(
           collectionRef,
           where('name', '>=', trimmedQuery),
           where('name', '<=', trimmedQuery + '\uf8ff'),
           limit(limitParam)
        );
      }
    } else if (roleFilter && roleFilter !== 'all') {
        q = query(
            collectionRef,
            where('role', '==', roleFilter),
            limit(limitParam)
         );
         // Pagination disabled for filter due to index requirement
    } else if (statusFilter && statusFilter !== 'all') {
        q = query(
            collectionRef,
            where('status', '==', statusFilter),
            limit(limitParam)
         );
         // Pagination disabled for filter due to index requirement
    } else {
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

    const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            created_at: data.created_at,
            email: data.email,
            name: data.name,
            otp: data.otp,
            phone: data.phone,
            role: data.role,
            start_date: data.start_date,
            status: data.status,
            topic: data.topic,
            updated_at: data.updated_at
        };
    });

    return NextResponse.json({
      users,
      total: searchQuery || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all') ? users.length : total,
      hasMore: users.length === limitParam
    });
  } catch (error) {
    console.error('Error fetching app users:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        // Fields that are allowed to be updated
        const allowedFields = ['email', 'name', 'otp', 'phone', 'role', 'start_date', 'status', 'topic'];
        const dataToUpdate: any = {};

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                dataToUpdate[field] = updateData[field];
            }
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        dataToUpdate.updated_at = Math.floor(Date.now() / 1000);

        const userRef = doc(db, 'login_users', id);
        await updateDoc(userRef, dataToUpdate);

        return NextResponse.json({ success: true, updatedFields: dataToUpdate });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
