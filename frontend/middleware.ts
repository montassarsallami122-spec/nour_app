import { NextRequest, NextResponse } from 'next/server';

// Protège les routes privées : redirige vers /login si le cookie de session
// est absent ou invalide. Le secret attendu reste côté serveur.
const PROTECTED = ['/chatbot', '/dashboard'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!needsAuth) return NextResponse.next();

  const secret = process.env.AUTH_SECRET || 'dev-secret';
  const session = req.cookies.get('rh_session')?.value;

  if (session !== secret) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/chatbot/:path*', '/dashboard/:path*'],
};
