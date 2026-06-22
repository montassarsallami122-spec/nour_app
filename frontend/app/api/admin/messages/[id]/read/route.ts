import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../../../../lib/api';

// Marque un message de contact comme lu (admin + rh — contrôlé côté backend).
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const r = await backendFetch(`/api/admin/messages/${encodeURIComponent(id)}/read`, { method: 'POST' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
