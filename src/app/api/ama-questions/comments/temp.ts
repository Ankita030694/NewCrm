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
  { params }: { params: { id: string } }
) {
  try {
    // Access params async in Next 15 but currently this is Next 14 syntax compatibility?
    // Or standard approach.
    // The route path is /api/ama-questions/[id]/comments/route.ts
    // We need to create the directory first.
    // I will handle this after creating the directory properly.
    // Wait, I haven't created the [id] directory yet because of glob error.
    // I'll use terminal to create it properly first.
    return NextResponse.json({ error: 'Not implemented yet' });
  } catch (error) {
     return NextResponse.json({ error: 'Error' });
  }
}

