import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { extractDocId, fetchDocContent, hashContent } from '@/lib/doc';
import { sendUpdateEmail } from '@/lib/mailer';
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || !timingSafeEqual(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();
  const db = getDb();

  const envDocUrl = process.env.DOC_URL ?? '';
  if (envDocUrl) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO doc_state (id, doc_url) VALUES (1, ?)`,
      args: [envDocUrl],
    });
  }

  const stateResult = await db.execute(`SELECT * FROM doc_state WHERE id = 1`);
  const state = stateResult.rows[0] as unknown as { doc_url: string; content_hash: string | null } | undefined;

  if (!state) {
    return NextResponse.json({ ok: true, message: 'No doc configured yet — set DOC_URL env var' });
  }

  const docId = extractDocId(state.doc_url as string);
  if (!docId) {
    return NextResponse.json({ error: 'Bad doc URL in state' }, { status: 500 });
  }

  const content = await fetchDocContent(docId);
  const hash = hashContent(content);
  const now = new Date().toISOString();

  if (hash === state.content_hash) {
    await db.execute({ sql: `UPDATE doc_state SET last_checked = ? WHERE id = 1`, args: [now] });
    await db.execute({ sql: `INSERT INTO checks (checked_at, changed, notified) VALUES (?, 0, 0)`, args: [now] });
    return NextResponse.json({ ok: true, changed: false });
  }

  const subsResult = await db.execute(`SELECT email, unsubscribe_token FROM subscribers WHERE confirmed = 1`);
  const subscribers = subsResult.rows as unknown as { email: string; unsubscribe_token: string }[];
  const emails = subscribers.map((s) => s.email);
  const unsubscribeTokens = Object.fromEntries(subscribers.map((s) => [s.email, s.unsubscribe_token]));

  if (emails.length > 0) {
    await sendUpdateEmail(emails, state.doc_url as string, unsubscribeTokens);
  }

  await db.execute({
    sql: `UPDATE doc_state SET content_hash = ?, last_checked = ?, last_changed = ? WHERE id = 1`,
    args: [hash, now, now],
  });
  await db.execute({
    sql: `INSERT INTO checks (checked_at, changed, notified) VALUES (?, 1, ?)`,
    args: [now, emails.length],
  });

  return NextResponse.json({ ok: true, changed: true, notified: emails.length });
}
