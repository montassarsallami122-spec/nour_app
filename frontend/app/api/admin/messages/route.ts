import { NextResponse } from 'next/server';
import { backendFetch } from '../../../lib/api';

// Boîte de réception des messages de contact (admin + rh — contrôlé côté backend).
export async function GET() {
  try {
    const r = await backendFetch('/api/admin/messages');
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
