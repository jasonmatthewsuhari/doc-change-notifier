import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?status=invalid', req.url));

  const db = getDb();
  const result = db.prepare(`
    UPDATE subscribers SET confirmed = 1 WHERE confirm_token = ? AND confirmed = 0
  `).run(token);

  if (result.changes === 0) {
    return NextResponse.redirect(new URL('/?status=already-confirmed', req.url));
  }

  return NextResponse.redirect(new URL('/?status=confirmed', req.url));
}
