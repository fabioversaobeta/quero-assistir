import { NextResponse, type NextRequest } from 'next/server';

/** Barreira leve: sem cookie, vai para /login. A autorização real (ADMIN) é feita pela API. */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('qa_token');
  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/api/session');
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
