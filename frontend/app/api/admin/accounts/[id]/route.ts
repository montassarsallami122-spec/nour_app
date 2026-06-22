import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../../../lib/api';

// Suppression d'un compte (admin uniquement).
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const r = await backendFetch(`/api/admin/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
