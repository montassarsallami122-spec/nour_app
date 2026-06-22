import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../../lib/api';

// Liste des comptes (admin uniquement — contrôlé côté backend).
export async function GET() {
  try {
    const r = await backendFetch('/api/admin/accounts');
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}

// Création d'un compte pour un matricule existant (admin uniquement).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  try {
    const r = await backendFetch('/api/admin/accounts', { method: 'POST', body: JSON.stringify(body) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
