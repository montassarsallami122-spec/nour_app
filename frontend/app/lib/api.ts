import { cookies } from 'next/headers';

// Nom du cookie de session (httpOnly) qui contient le jeton signé par le backend.
export const SESSION_COOKIE = 'rh_session';

// Proxy serveur -> backend Express. La clé d'API et le jeton de session restent
// côté serveur ; le navigateur ne les voit jamais. Le jeton de session (lu depuis
// le cookie httpOnly) est transmis au backend qui en déduit l'identité/le rôle.
export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const backend = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.APP_API_KEY || '';
  const token = (await cookies()).get(SESSION_COOKIE)?.value || '';
  return fetch(`${backend}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-session-token': token,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
}
