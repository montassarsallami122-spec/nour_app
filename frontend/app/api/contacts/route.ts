import { NextResponse } from 'next/server';
import { backendFetch } from '../../lib/api';

// Coordonnées publiques de l'équipe RH (affichées sur la page Contact).
export async function GET() {
  try {
    const r = await backendFetch('/api/contacts');
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
