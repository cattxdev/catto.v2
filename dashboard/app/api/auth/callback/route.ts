import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  console.log('Auth callback received, token:', token ? 'present' : 'missing');

  if (!token) {
    // No token, redirect to home
    console.log('No token, redirecting to home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set('DASHBOARD_AUTH', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  console.log('Cookie set, redirecting to /guilds');

  // Redirect to guilds page
  return NextResponse.redirect(new URL('/guilds', request.url));
}
