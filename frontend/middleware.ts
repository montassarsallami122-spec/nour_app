import { NextRequest, NextResponse } from 'next/server';

// Protège les routes privées. Le middleware ne fait que du ROUTAGE (présence/
// expiration du jeton, rôle pour /admin, redirection vers le changement de mot
// de passe forcé). La vraie sécurité est appliquée côté backend, qui VÉRIFIE la
// signature du jeton sur chaque appel de données : un cookie falsifié ne permet
// d'atteindre aucune donnée.
const PROTECTED = ['/chatbot', '/dashboard', '/admin', '/notifications', '/change-password'];

interface Payload {
  role?: 'admin' | 'rh' | 'employee';
  mustReset?: boolean;
  exp?: number;
}

// Décode (sans vérifier la signature) le payload base64url du jeton.
function decodePayload(token: string | undefined): Payload | null {
  if (!token) return null;
  try {
    const body = token.split('.')[0];
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json) as Payload;
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!needsAuth) return NextResponse.next();

  const payload = decodePayload(req.cookies.get('rh_session')?.value);

  // Pas de session valide -> login.
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Changement de mot de passe forcé à la première connexion.
  if (payload.mustReset && pathname !== '/change-password') {
    const url = req.nextUrl.clone();
    url.pathname = '/change-password';
    return NextResponse.redirect(url);
  }

  const isStaff = payload.role === 'admin' || payload.role === 'rh';

  // Espace d'administration réservé aux admins.
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && payload.role !== 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Espace RH (alertes & messages) réservé au personnel RH (admin + rh).
  if ((pathname === '/notifications' || pathname.startsWith('/notifications/')) && !isStaff) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chatbot/:path*', '/dashboard/:path*', '/admin/:path*', '/notifications/:path*', '/change-password'],
};
