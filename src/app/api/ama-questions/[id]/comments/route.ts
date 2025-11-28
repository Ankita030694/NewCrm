import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/ama_app';
import {
  collection,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    
    if (!id) {
        return NextResponse.json({ error: 'Missing question ID' }, { status: 400 });
    }

    const commentsRef = collection(db, 'questions', id, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc')); // Oldest first typically for comments
    
    const snapshot = await getDocs(q);
    
    const comments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            commentedBy: data.commentedBy,
            content: data.content,
            phone: data.phone,
            profileImgUrl: data.profileImgUrl,
            timestamp: data.timestamp,
            userRole: data.userRole
        };
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
