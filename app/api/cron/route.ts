import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractDocId, fetchDocContent, hashContent } from '@/lib/doc';
import { sendUpdateEmail } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const state = db.prepare('SELECT * FROM doc_state WHERE id = 1').get() as {
    doc_url: string;
    content_hash: string | null;
  } | undefined;

  if (!state) {
    return NextResponse.json({ ok: true, message: 'No doc configured yet' });
  }

  const docId = extractDocId(state.doc_url);
  if (!docId) {
    return NextResponse.json({ error: 'Bad doc URL in state' }, { status: 500 });
  }

  const content = await fetchDocContent(docId);
  const hash = hashContent(content);
  const now = new Date().toISOString();

  if (hash === state.content_hash) {
    db.prepare('UPDATE doc_state SET last_checked = ? WHERE id = 1').run(now);
    return NextResponse.json({ ok: true, changed: false });
  }

  const subscribers = db.prepare(
    'SELECT email, unsubscribe_token FROM subscribers WHERE confirmed = 1'
  ).all() as { email: string; unsubscribe_token: string }[];

  const emails = subscribers.map((s) => s.email);
  const unsubscribeTokens = Object.fromEntries(
    subscribers.map((s) => [s.email, s.unsubscribe_token])
  );

  if (emails.length > 0) {
    await sendUpdateEmail(emails, state.doc_url, unsubscribeTokens);
  }

  db.prepare(`
    UPDATE doc_state SET content_hash = ?, last_checked = ?, last_changed = ? WHERE id = 1
  `).run(hash, now, now);

  return NextResponse.json({ ok: true, changed: true, notified: emails.length });
}
