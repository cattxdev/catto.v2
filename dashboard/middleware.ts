import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /mod/* routes (exclude /mod/login itself)
  if (pathname.startsWith('/mod') && pathname !== '/mod/login') {
    const sessionCookie = request.cookies.get('DASHBOARD_AUTH');

    if (!sessionCookie?.value) {
      const loginUrl = new URL('/mod/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/mod/:path*'],
};
