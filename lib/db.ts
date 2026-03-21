import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return client;
}

export async function initDb() {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirm_token TEXT UNIQUE NOT NULL,
      unsubscribe_token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checked_at TEXT NOT NULL DEFAULT (datetime('now')),
      changed INTEGER NOT NULL DEFAULT 0,
      notified INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS doc_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      doc_url TEXT NOT NULL,
      content_hash TEXT,
      last_checked TEXT,
      last_changed TEXT
    );
  `);
}
