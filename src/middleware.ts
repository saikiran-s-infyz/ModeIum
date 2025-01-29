import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login';

  // Get the token from the cookies
  const token = request.cookies.get('auth')?.value || '';

  // Redirect logged in users away from login page
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Redirect non-logged in users to login page
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/chat/:page*'
  ]
}