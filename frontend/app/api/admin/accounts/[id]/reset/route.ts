import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../../../../lib/api';

// Réinitialisation du mot de passe d'un compte (admin uniquement).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  try {
    const r = await backendFetch(`/api/admin/accounts/${encodeURIComponent(id)}/reset`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
