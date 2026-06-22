// Authentification : hachage de mot de passe (scrypt) + jetons de session signés (HMAC).
// Tout repose sur le module natif node:crypto — aucune dépendance externe.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { config } from './config.js';

// --- Mots de passe -------------------------------------------------------------
// Format stocké en base : "<salt_hex>:<hash_hex>". Le sel est aléatoire par compte.
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(plain, salt, expected.length);
  // Comparaison à temps constant pour éviter les attaques temporelles.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- Jetons de session signés (mini-JWT maison) --------------------------------
// Forme : base64url(payload).base64url(hmacSHA256(payload)). Lisible par le
// middleware (décodage du payload pour le routage) et vérifiable côté backend.
// Rôles applicatifs :
//  - admin    : tout pouvoir, gère les comptes
//  - rh       : accès complet tableau de bord + chatbot + alertes RH, mais NE
//               PEUT PAS créer de comptes ; pas de matricule (compte de service)
//  - employee : accès strictement limité à SES propres données (matricule)
export type Role = 'admin' | 'rh' | 'employee';

export interface SessionPayload {
  sub: number;        // id du compte
  matricule: number;  // employé lié (0 pour admin / rh)
  role: Role;
  mustReset: boolean; // changement de mot de passe forcé à la 1re connexion
  exp: number;        // expiration (epoch ms)
}

const b64url = (buf: Buffer | string): string =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(data: string): string {
  return b64url(createHmac('sha256', config.authSecret).update(data).digest());
}

export function signToken(payload: Omit<SessionPayload, 'exp'>, ttlMs = 8 * 60 * 60 * 1000): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + ttlMs };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  // Vérification de signature à temps constant.
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
