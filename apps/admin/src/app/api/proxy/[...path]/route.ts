import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

type Context = { params: Promise<{ path: string[] }> };

/** Proxy das chamadas do navegador para a API, anexando o token do cookie. Só expõe /v1/admin/*. */
async function forward(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const target = path.join('/');
  if (!target.startsWith('v1/admin/')) {
    return NextResponse.json({ message: 'Rota não permitida' }, { status: 404 });
  }
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const hasBody = !['GET', 'HEAD'].includes(request.method);

  const upstream = await fetch(`${API_URL}/${target}${request.nextUrl.search}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  });
  return new NextResponse(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
