import { NextResponse } from 'next/server';

// Supprime le cookie de session.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('rh_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
