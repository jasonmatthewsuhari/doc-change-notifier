import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?status=invalid', req.url));

  await initDb();
  const db = getDb();

  await db.execute({
    sql: `DELETE FROM subscribers WHERE unsubscribe_token = ?`,
    args: [token],
  });

  return NextResponse.redirect(new URL('/?status=unsubscribed', req.url));
}
