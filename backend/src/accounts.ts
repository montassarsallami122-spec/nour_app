// Gestion des comptes utilisateurs.
// IMPORTANT : la table `accounts` est créée à part et N'EST JAMAIS supprimée par
// initSchema()/ingest (qui font DROP TABLE sur employees/absences). Les comptes
// survivent donc aux ré-imports de données.
import { db } from './db.js';
import { hashPassword, type Role } from './auth.js';
import { config } from './config.js';

export interface Account {
  id: number;
  username: string;
  matricule: number;
  role: Role;
  email: string | null;
  phone: string | null;
  must_reset: number; // 0 | 1
  created_at: string;
}

export function initAccountsSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      matricule     INTEGER NOT NULL,
      role          TEXT NOT NULL DEFAULT 'employee',
      must_reset    INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL
    );
  `);
  // Migration en douceur : ajoute email/phone aux bases existantes (pour les
  // comptes RH, dont les coordonnées alimentent la page « Contact »).
  const cols = (db.prepare('PRAGMA table_info(accounts)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('email')) db.exec('ALTER TABLE accounts ADD COLUMN email TEXT');
  if (!cols.includes('phone')) db.exec('ALTER TABLE accounts ADD COLUMN phone TEXT');
}

// Crée le compte admin initial s'il n'existe aucun admin (bootstrap).
export function seedAdmin(): void {
  const existing = db.prepare(`SELECT COUNT(*) c FROM accounts WHERE role = 'admin'`).get() as { c: number };
  if (existing.c > 0) return;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO accounts (username, password_hash, matricule, role, must_reset, created_at)
     VALUES (?, ?, 0, 'admin', 0, ?)`
  ).run(config.seedAdminUser, hashPassword(config.seedAdminPassword), now);
  console.log(`👤 Compte admin initial créé : "${config.seedAdminUser}" (pensez à changer le mot de passe).`);
}

export function getByUsername(username: string): (Account & { password_hash: string }) | undefined {
  return db.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as
    | (Account & { password_hash: string })
    | undefined;
}

export function getById(id: number): (Account & { password_hash: string }) | undefined {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as
    | (Account & { password_hash: string })
    | undefined;
}

export function matriculeExists(matricule: number): boolean {
  const r = db.prepare('SELECT 1 FROM employees WHERE matricule = ? LIMIT 1').get(matricule);
  return !!r;
}

export interface CreateAccountInput {
  username: string;
  password: string;
  matricule: number;
  role?: Role;
  email?: string;
  phone?: string;
}

// Crée un compte :
//  - employee : exige un matricule EXISTANT dans les données employés.
//  - rh       : pas de matricule (forcé à 0) ; email/téléphone facultatifs mais
//               recommandés (affichés sur la page « Contact »).
// Renvoie une erreur explicite si le matricule est inconnu ou si le nom est pris.
export function createAccount(input: CreateAccountInput): Account {
  const username = input.username.trim();
  const role: Role = input.role ?? 'employee';
  const email = (input.email ?? '').trim() || null;
  const phone = (input.phone ?? '').trim() || null;
  if (!username) throw new Error("Nom d'utilisateur requis.");
  if (!input.password || input.password.length < 6)
    throw new Error('Mot de passe requis (6 caractères minimum).');
  if (role === 'employee' && !matriculeExists(input.matricule))
    throw new Error(`Matricule ${input.matricule} introuvable dans les données employés.`);
  if (getByUsername(username))
    throw new Error(`Le nom d'utilisateur "${username}" est déjà pris.`);

  // Seul un employé est rattaché à un matricule ; admin/rh sont des comptes de service.
  const matricule = role === 'employee' ? input.matricule : 0;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO accounts (username, password_hash, matricule, role, email, phone, must_reset, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(username, hashPassword(input.password), matricule, role, email, phone, now);
  return getById(Number(info.lastInsertRowid))!;
}

export function listAccounts(): Account[] {
  return db
    .prepare('SELECT id, username, matricule, role, email, phone, must_reset, created_at FROM accounts ORDER BY created_at DESC')
    .all() as unknown as Account[];
}

// Coordonnées des RH publiées sur la page « Contact » (uniquement les comptes RH
// disposant d'une adresse e-mail). Aucune donnée sensible n'est exposée.
export interface RhContact {
  username: string;
  email: string;
  phone: string | null;
}
export function listRhContacts(): RhContact[] {
  return db
    .prepare(
      `SELECT username, email, phone FROM accounts
       WHERE role = 'rh' AND email IS NOT NULL AND email <> ''
       ORDER BY username`
    )
    .all() as unknown as RhContact[];
}

export function deleteAccount(id: number): void {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

// Réinitialise le mot de passe (par l'admin) -> force un changement à la prochaine connexion.
export function resetPassword(id: number, newPassword: string): void {
  if (!newPassword || newPassword.length < 6)
    throw new Error('Mot de passe requis (6 caractères minimum).');
  db.prepare('UPDATE accounts SET password_hash = ?, must_reset = 1 WHERE id = ?').run(
    hashPassword(newPassword),
    id
  );
}

// Changement de mot de passe par l'utilisateur lui-même -> lève le drapeau must_reset.
export function setOwnPassword(id: number, newPassword: string): void {
  if (!newPassword || newPassword.length < 6)
    throw new Error('Mot de passe requis (6 caractères minimum).');
  db.prepare('UPDATE accounts SET password_hash = ?, must_reset = 0 WHERE id = ?').run(
    hashPassword(newPassword),
    id
  );
}
