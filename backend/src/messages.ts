// Messages de contact envoyés depuis la page publique « Contact ».
// Stockés en base et consultables par les comptes admin/rh (boîte de réception).
// La table survit aux ré-imports de données (pas de DROP, comme `accounts`).
import { db } from './db.js';

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  is_read: number; // 0 | 1
  created_at: string;
}

export function initMessagesSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      subject    TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL,
      is_read    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

export interface CreateMessageInput {
  name: string;
  email: string;
  subject?: string;
  body: string;
}

export function createMessage(input: CreateMessageInput): ContactMessage {
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const subject = (input.subject ?? '').trim();
  const body = (input.body ?? '').trim();
  if (!name) throw new Error('Nom requis.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  if (!body) throw new Error('Message requis.');

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO contact_messages (name, email, subject, body, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(name, email, subject, body, now);
  return db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as ContactMessage;
}

export function listMessages(): ContactMessage[] {
  return db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() as unknown as ContactMessage[];
}

export function countUnread(): number {
  const r = db.prepare('SELECT COUNT(*) c FROM contact_messages WHERE is_read = 0').get() as { c: number };
  return r.c;
}

export function markRead(id: number): void {
  db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(id);
}

export function deleteMessage(id: number): void {
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
}
