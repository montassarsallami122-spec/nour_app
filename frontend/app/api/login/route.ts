import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, SESSION_COOKIE } from '../../lib/api';

// Authentifie l'utilisateur via le backend (table accounts) et pose le jeton de
// session signé dans un cookie httpOnly. Aucun secret n'est exposé au navigateur.
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  let data: { token?: string; role?: string; mustReset?: boolean; error?: string };
  try {
    const r = await backendFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: body.username, password: body.password }),
    });
    data = await r.json();
    if (!r.ok || !data.token) {
      return NextResponse.json({ error: data.error || 'Échec de la connexion.' }, { status: r.status || 401 });
    }
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true, role: data.role, mustReset: data.mustReset });
  res.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 heures (doit rester <= TTL du jeton backend)
  });
  return res;
}
