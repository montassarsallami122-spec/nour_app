import { NextResponse } from 'next/server';
import { backendFetch } from '../../lib/api';

// Profil de l'utilisateur connecté (id, username, role, matricule, mustReset).
export async function GET() {
  try {
    const r = await backendFetch('/api/me');
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
