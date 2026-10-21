import { Database } from "tjs:sqlite";
import type { DocumentVersion, WritingStat } from "../shared/types.ts";

let db: Database | null = null;

function database(): Database {
  if (!db) throw new Error("database is not initialized");
  return db;
}

export async function initDatabase(dir: string): Promise<void> {
  await tjs.makeDir(dir, { recursive: true });
  db = new Database(`${dir}/right-stuff.sqlite`);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_document_versions_path
      ON document_versions(path, saved_at);
    CREATE TABLE IF NOT EXISTS writing_stats (
      date TEXT PRIMARY KEY,
      chars_written INTEGER NOT NULL DEFAULT 0,
      focus_ms INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      category TEXT,
      builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recovery_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recovery_created
      ON recovery_snapshots(created_at);
  `);
}

export function getSetting<T>(key: string, fallback: T): T {
  const rows = database()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .all(key) as Array<{ value: string }>;
  if (!rows.length) return fallback;
  try {
    return JSON.parse(rows[0].value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  database()
    .prepare(
      "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, JSON.stringify(value));
}

export function addVersion(path: string, title: string, content: string): void {
  const rows = database()
    .prepare(
      "SELECT content FROM document_versions WHERE path = ? ORDER BY saved_at DESC, id DESC LIMIT 1",
    )
    .all(path) as Array<{ content: string }>;
  if (rows[0]?.content === content) return;
  database()
    .prepare(
      "INSERT INTO document_versions(path, title, content, saved_at) VALUES(?, ?, ?, ?)",
    )
    .run(path, title, content, new Date().toISOString());
  pruneVersions(path);
}

export function listVersions(path: string, limit = 10): DocumentVersion[] {
  const rows = database()
    .prepare(
      "SELECT id, path, title, content, saved_at FROM document_versions WHERE path = ? ORDER BY saved_at DESC, id DESC LIMIT ?",
    )
    .all(path, limit) as Array<{
    id: number;
    path: string;
    title: string;
    content: string;
    saved_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    savedAt: row.saved_at,
  }));
}

export function pruneVersions(path: string, keep = 20): void {
  database()
    .prepare(
      "DELETE FROM document_versions WHERE path = ? AND id NOT IN (SELECT id FROM document_versions WHERE path = ? ORDER BY saved_at DESC, id DESC LIMIT ?)",
    )
    .run(path, path, keep);
}

export function deleteVersions(path: string): void {
  database().prepare("DELETE FROM document_versions WHERE path = ?").run(path);
}

export function bumpWritingStat(date: string, deltaChars: number, deltaFocusMs: number): void {
  database()
    .prepare(
      `INSERT INTO writing_stats(date, chars_written, focus_ms) VALUES(?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         chars_written = chars_written + excluded.chars_written,
         focus_ms = focus_ms + excluded.focus_ms`,
    )
    .run(date, Math.max(0, deltaChars), Math.max(0, deltaFocusMs));
}

export function getWritingStats(days: number): WritingStat[] {
  const rows = database()
    .prepare(
      "SELECT date, chars_written, focus_ms FROM writing_stats ORDER BY date DESC LIMIT ?",
    )
    .all(days) as Array<{ date: string; chars_written: number; focus_ms: number }>;
  return rows.map((row) => ({
    date: row.date,
    charsWritten: row.chars_written,
    focusMs: row.focus_ms,
  }));
}

export function saveRecovery(path: string | null, title: string, content: string): number {
  const rows = database()
    .prepare(
      "INSERT INTO recovery_snapshots(path, title, content, created_at) VALUES(?, ?, ?, ?) RETURNING id",
    )
    .all(path, title, content, new Date().toISOString()) as Array<{ id: number }>;
  database()
    .prepare(
      "DELETE FROM recovery_snapshots WHERE id NOT IN (SELECT id FROM recovery_snapshots ORDER BY created_at DESC LIMIT 50)",
    )
    .run();
  return rows[0].id;
}

export interface RecoverySnapshot {
  id: number;
  path: string | null;
  title: string;
  content: string;
  createdAt: string;
}

export function latestRecovery(path: string | null): RecoverySnapshot | null {
  const rows = database()
    .prepare(
      "SELECT id, path, title, content, created_at FROM recovery_snapshots WHERE path IS ? ORDER BY created_at DESC, id DESC LIMIT 1",
    )
    .all(path) as Array<{
    id: number;
    path: string | null;
    title: string;
    content: string;
    created_at: string;
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function clearRecovery(path: string | null): void {
  if (path === null) {
    database().prepare("DELETE FROM recovery_snapshots WHERE path IS NULL").run();
  } else {
    database().prepare("DELETE FROM recovery_snapshots WHERE path = ?").run(path);
  }
}

export interface TemplateRow {
  id: number;
  uuid: string;
  name: string;
  description: string;
  content: string;
  category: string | null;
  builtin: number;
  createdAt: string;
  updatedAt: string;
}

export function listTemplates(): TemplateRow[] {
  const rows = database()
    .prepare(
      "SELECT id, uuid, name, description, content, category, builtin, created_at, updated_at FROM templates ORDER BY updated_at DESC",
    )
    .all() as Array<{
    id: number;
    uuid: string;
    name: string;
    description: string;
    content: string;
    category: string | null;
    builtin: number;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    description: row.description,
    content: row.content,
    category: row.category,
    builtin: row.builtin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function upsertTemplate(input: {
  uuid: string;
  name: string;
  description: string;
  content: string;
  category?: string | null;
  builtin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}): void {
  const now = new Date().toISOString();
  database()
    .prepare(
      `INSERT INTO templates(uuid, name, description, content, category, builtin, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         content = excluded.content,
         category = excluded.category,
         builtin = excluded.builtin,
         updated_at = excluded.updated_at`,
    )
    .run(
      input.uuid,
      input.name,
      input.description,
      input.content,
      input.category ?? null,
      input.builtin ? 1 : 0,
      input.createdAt ?? now,
      input.updatedAt ?? now,
    );
}

export function deleteTemplate(uuid: string): void {
  database().prepare("DELETE FROM templates WHERE uuid = ?").run(uuid);
}

export interface ChatRow {
  id: number;
  uuid: string;
  title: string;
  messages: string;
  createdAt: string;
  updatedAt: string;
}

export function listChatSessions(): ChatRow[] {
  const rows = database()
    .prepare(
      "SELECT id, uuid, title, messages, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC",
    )
    .all() as Array<{
    id: number;
    uuid: string;
    title: string;
    messages: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    title: row.title,
    messages: row.messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function upsertChatSession(input: {
  uuid: string;
  title: string;
  messages: string;
  createdAt?: string;
  updatedAt?: string;
}): void {
  const now = new Date().toISOString();
  database()
    .prepare(
      `INSERT INTO chat_sessions(uuid, title, messages, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         title = excluded.title,
         messages = excluded.messages,
         updated_at = excluded.updated_at`,
    )
    .run(input.uuid, input.title, input.messages, input.createdAt ?? now, input.updatedAt ?? now);
}

export function deleteChatSession(uuid: string): void {
  database().prepare("DELETE FROM chat_sessions WHERE uuid = ?").run(uuid);
}
