import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const checks = db.prepare(`
    SELECT checked_at, changed, notified
    FROM checks
    ORDER BY id DESC
    LIMIT 100
  `).all() as { checked_at: string; changed: number; notified: number }[];

  const state = db.prepare('SELECT last_changed, doc_url FROM doc_state WHERE id = 1').get() as {
    last_changed: string | null;
    doc_url: string;
  } | undefined;

  return NextResponse.json({ checks, state });
}
