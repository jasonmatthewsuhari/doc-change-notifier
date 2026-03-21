import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?status=invalid', req.url));

  const db = getDb();
  db.prepare('DELETE FROM subscribers WHERE unsubscribe_token = ?').run(token);

  return NextResponse.redirect(new URL('/?status=unsubscribed', req.url));
}
