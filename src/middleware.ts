import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require auth
const publicPaths = ['/', '/sign-in', '/sign-up', '/ranks', '/impact', '/feed', '/post', '/leaderboard', '/how-it-works', '/legal-policies'];
const publicApiPaths = ['/api/health', '/api/accounts', '/api/feed', '/api/impact', '/api/og', '/api/report-issue', '/api/webhooks'];
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

const REPORTS_API_RESERVED = new Set(['queue']);

/** Read-only report endpoints + anonymous filing; not the whole /api/reports tree. */
function isPublicReportsApi(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] !== 'api' || segments[1] !== 'reports') return false;

  if (segments.length === 2 && method === 'POST') {
    return false;
  }

  if (segments.length === 3 && method === 'GET' && !REPORTS_API_RESERVED.has(segments[2])) {
    return true;
  }

  if (segments.length === 4 && method === 'GET') {
    const sub = segments[3];
    return sub === 'interactions' || sub === 'comments';
  }

  return false;
}

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

  if (isPublicReportsApi(req)) {
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
