import { NextResponse } from 'next/server';
import type { AuthResponse } from '@quero-assistir/contracts';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

/** Login: troca o idToken do Google por um JWT da API e o guarda em cookie httpOnly. */
export async function POST(request: Request) {
  const { idToken } = (await request.json()) as { idToken?: string };
  if (!idToken) return NextResponse.json({ message: 'idToken ausente' }, { status: 400 });

  const response = await fetch(`${API_URL}/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return NextResponse.json({ message: 'Login recusado' }, { status: 401 });

  const auth = (await response.json()) as AuthResponse;
  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Esta conta não é administradora' }, { status: 403 });
  }

  const result = NextResponse.json({ ok: true });
  result.cookies.set(TOKEN_COOKIE, auth.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.min(auth.expiresInSeconds, 60 * 60 * 24 * 7),
  });
  return result;
}

export async function DELETE() {
  const result = NextResponse.json({ ok: true });
  result.cookies.delete(TOKEN_COOKIE);
  return result;
}
