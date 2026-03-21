import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?status=invalid', req.url));

  await initDb();
  const db = getDb();

  const result = await db.execute({
    sql: `UPDATE subscribers SET confirmed = 1 WHERE confirm_token = ? AND confirmed = 0`,
    args: [token],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.redirect(new URL('/?status=already-confirmed', req.url));
  }

  return NextResponse.redirect(new URL('/?status=confirmed', req.url));
}
