import { NextResponse } from 'next/server';

const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./
];
const ALLOWED_IMAGE_HOSTS = (process.env.PROXY_IMAGE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

/** Reject loopback/private host targets for proxy fetches. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(host)) return true;
  if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(host))) return true;
  return host.endsWith('.local') || host.endsWith('.internal');
}

/** Enforces explicit allowlist when configured; otherwise blocks private hosts. */
function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_IMAGE_HOSTS.length === 0) return !isPrivateHost(host);
  return ALLOWED_IMAGE_HOSTS.includes(host);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
      return new NextResponse('Disallowed image URL', { status: 400 });
    }

    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return new NextResponse('Only image content is allowed', { status: 415 });
    }

    const buffer = await res.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return new NextResponse('Invalid url parameter', { status: 400 });
    }
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
}
