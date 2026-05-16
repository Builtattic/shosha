import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require auth
const publicPaths = ['/', '/sign-in', '/sign-up', '/ranks', '/impact', '/feed', '/leaderboard', '/how-it-works'];
const publicApiPaths = ['/api/health', '/api/events', '/api/accounts', '/api/feed', '/api/impact', '/api/og'];
const protectedPathPrefixes = [
  '/account',
  '/admin',
  '/bookmarks',
  '/dashboard',
  '/disputes',
  '/notifications',
  '/onboard',
  '/profile',
  '/search',
  '/settings',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow public API paths
  if (publicApiPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const segmentCount = pathname.split('/').filter(Boolean).length;
  const isProtectedPath = protectedPathPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (segmentCount === 1 && !isProtectedPath) {
    return NextResponse.next();
  }

  // For protected routes, check for the Firebase session cookie or Authorization header
  const session = req.cookies.get('__session')?.value;
  const authHeader = req.headers.get('Authorization');

  if (!session && !authHeader) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)']
};
