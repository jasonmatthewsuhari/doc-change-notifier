import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
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
  return db;
}
