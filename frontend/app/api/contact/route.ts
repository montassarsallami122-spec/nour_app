import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../lib/api';

// Envoi d'un message depuis le formulaire de contact public (enregistré côté backend).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  try {
    const r = await backendFetch('/api/contact', { method: 'POST', body: JSON.stringify(body) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
