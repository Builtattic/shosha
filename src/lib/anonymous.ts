import crypto from 'crypto';

function getAnonymousSalt() {
  const salt = process.env.ANONYMOUS_TAG_SALT;
  if (salt) return salt;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ANONYMOUS_TAG_SALT is required in production');
  }
  return 'dev-salt-local-only';
}

export function anonymousHash(request: Request) {
  const salt = getAnonymousSalt();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  const ua = request.headers.get('user-agent') ?? 'unknown';
  return crypto.createHash('sha256').update(`${ip}:${ua}:${salt}`).digest('hex');
}

export function anonymousTag(request: Request) {
  const hash = anonymousHash(request);
  return `anon_${hash.slice(0, 4)}`;
}
