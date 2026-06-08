import { NextRequest, NextResponse } from 'next/server';

// Route handler côté serveur : proxy vers le backend Express.
// La clé APP_API_KEY reste sur le serveur Next.js et n'est jamais envoyée au navigateur.
export async function POST(req: NextRequest) {
  const backend = process.env.BACKEND_URL || 'http://localhost:3001';
  const apiKey = process.env.APP_API_KEY || '';

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  try {
    const r = await fetch(`${backend}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ question: body.question }),
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
