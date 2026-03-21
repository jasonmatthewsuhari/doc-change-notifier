import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { sendConfirmationEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  await initDb();
  const db = getDb();

  const confirmToken = crypto.randomBytes(32).toString('hex');
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');

  await db.execute({
    sql: `INSERT INTO subscribers (email, confirm_token, unsubscribe_token)
          VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET confirm_token = excluded.confirm_token`,
    args: [email, confirmToken, unsubscribeToken],
  });

  await sendConfirmationEmail(email, confirmToken);

  return NextResponse.json({ ok: true });
}
