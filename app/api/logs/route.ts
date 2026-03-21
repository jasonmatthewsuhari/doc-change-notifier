import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const db = getDb();

  const checksResult = await db.execute(`
    SELECT checked_at, changed, notified FROM checks ORDER BY id DESC LIMIT 100
  `);
  const stateResult = await db.execute(`SELECT last_changed FROM doc_state WHERE id = 1`);

  return NextResponse.json({
    checks: checksResult.rows,
    state: stateResult.rows[0] ?? null,
  });
}
