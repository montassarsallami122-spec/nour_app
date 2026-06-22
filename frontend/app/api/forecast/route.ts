import { NextResponse } from 'next/server';
import { backendFetch } from '../../lib/api';

// Prévisions RH (absentéisme & turnover). Le backend restreint l'accès à admin + rh.
export async function GET() {
  try {
    const r = await backendFetch('/api/forecast');
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Backend injoignable: ${(e as Error).message}` }, { status: 502 });
  }
}
