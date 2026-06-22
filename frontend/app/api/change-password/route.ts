import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, SESSION_COOKIE } from '../../lib/api';

// Change le mot de passe de l'utilisateur connecté. Le backend renvoie un nouveau
// jeton (mustReset levé) que l'on réécrit dans le cookie de session.
export async function POST(req: NextRequest) {
  let body: { newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  let data: { ok?: boolean; token?: string; error?: string };
  try {
    const r = await backendFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: body.newPassword }),
    });
    data = await r.json();
    if (!r.ok || !data.token) {
      return NextResponse.json({ error: data.error || 'Échec du changement.' }, { status: r.status || 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
