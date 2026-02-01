import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const cookieStore = await cookies();

  // Set the auth cookie
  cookieStore.set('DASHBOARD_AUTH', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  // Check if there's a redirect destination (e.g. set by /mod/login)
  const redirectCookie = cookieStore.get('mod_auth_redirect');
  const destination = redirectCookie?.value || '/guilds';

  // Clear the redirect cookie
  if (redirectCookie) {
    cookieStore.delete('mod_auth_redirect');
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
