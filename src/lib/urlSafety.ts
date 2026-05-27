import { URL } from 'url';

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '127.0.0.1', '::1', '0.0.0.0',
]);

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (PRIVATE_IPV4.some((r) => r.test(h))) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  return false;
}

export function isSafeUrl(
  raw: string,
  { allowHttp = false }: { allowHttp?: boolean } = {}
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.protocol === 'http:' && !allowHttp) return false;
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return !isPrivateHostname(parsed.hostname);
}

export function parseSafeUrl(raw: string): URL | null {
  return isSafeUrl(raw) ? new URL(raw) : null;
}
