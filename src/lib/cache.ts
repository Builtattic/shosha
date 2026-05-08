import { Redis } from '@upstash/redis';

type RedisClient = Pick<Redis, 'get' | 'set'>;

const g = globalThis as unknown as {
  __shoshaRedisCache?: RedisClient | null;
};

function redis(): RedisClient | null {
  if (g.__shoshaRedisCache !== undefined) return g.__shoshaRedisCache;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  g.__shoshaRedisCache = url && token ? new Redis({ url, token }) : null;
  return g.__shoshaRedisCache;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const client = redis();
  if (!client) return null;

  try {
    const value = await client.get<string | T>(key);
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? JSON.parse(value) as T : value as T;
  } catch {
    return null;
  }
}

export async function setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = redis();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // Cache writes should never make a request fail.
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await getJson<T>(key);
  if (hit !== null) return hit;

  const value = await loader();
  if (value !== null && value !== undefined) {
    await setJson(key, value, ttlSeconds);
  }
  return value;
}

export function cacheKey(...parts: Array<string | number | boolean | null | undefined>) {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => encodeURIComponent(String(part)))
    .join(':');
}

