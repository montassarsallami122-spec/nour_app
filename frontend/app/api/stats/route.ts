import { NextResponse } from 'next/server';

// Proxy serveur vers le backend Express : la clé APP_API_KEY reste côté serveur.
export async function GET() {
  const backend = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.APP_API_KEY || '';

  try {
    const r = await fetch(`${backend}/api/stats`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: `Backend injoignable: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
