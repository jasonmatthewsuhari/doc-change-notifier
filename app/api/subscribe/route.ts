import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractDocId } from '@/lib/doc';
import { sendConfirmationEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email, docUrl } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const resolvedDocUrl = docUrl ?? process.env.DOC_URL ?? '';
  const docId = extractDocId(resolvedDocUrl);
  if (!docId) {
    return NextResponse.json({ error: 'Invalid doc URL' }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare('SELECT confirmed FROM subscribers WHERE email = ?').get(email) as { confirmed: number } | undefined;
  if (existing?.confirmed) {
    return NextResponse.json({ ok: true }); // already confirmed, silently succeed
  }

  const confirmToken = crypto.randomBytes(32).toString('hex');
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO subscribers (email, confirm_token, unsubscribe_token)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET confirm_token = excluded.confirm_token
  `).run(email, confirmToken, unsubscribeToken);

  db.prepare(`
    INSERT OR IGNORE INTO doc_state (id, doc_url) VALUES (1, ?)
  `).run(resolvedDocUrl);

  await sendConfirmationEmail(email, confirmToken);

  return NextResponse.json({ ok: true });
}
