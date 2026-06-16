import { NextRequest, NextResponse } from 'next/server';

// Valide les identifiants contre les variables d'environnement et pose un cookie
// de session httpOnly. Le secret n'est jamais exposé au navigateur.
export async function POST(req: NextRequest) {
  const expectedUser = process.env.AUTH_USERNAME || 'admin';
  const expectedPass = process.env.AUTH_PASSWORD || 'admin123';
  const secret = process.env.AUTH_SECRET || 'dev-secret';

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const { username, password } = body;
  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('rh_session', secret, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 heures
  });
  return res;
}
