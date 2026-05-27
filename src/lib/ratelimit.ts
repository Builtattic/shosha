import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

export const rateLimits = {
  signup: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), analytics: true })
    : null,
  reportAnon: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), analytics: true })
    : null,
  reportUser: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), analytics: true })
    : null,
  claim: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 d'), analytics: true })
    : null,
  search: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), analytics: true })
    : null,
  classifyAi: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 h'),
        analytics: true,
      })
    : null,
  analyzeAi: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 h'),
        analytics: true,
      })
    : null,
};

export const eventsLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'rl:events',
    })
  : null;

export function getRequestKey(request: Request, fallback = 'unknown') {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || fallback;
}

export async function assertLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ allowed: true } | { allowed: false }> {
  if (!limiter) return { allowed: false };
  try {
    const result = await limiter.limit(key);
    return result.success ? { allowed: true } : { allowed: false };
  } catch {
    return { allowed: false };
  }
}

export function skipLimit(): { allowed: true } {
  return { allowed: true };
}
