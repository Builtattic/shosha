import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    set: vi.fn(),
  },
  Redis: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: redisMock.Redis,
}));

async function importCache() {
  vi.resetModules();
  delete (globalThis as any).__shoshaRedisCache;
  return import('@/lib/cache');
}

describe('cache helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    redisMock.Redis.mockReturnValue(redisMock.client);
    redisMock.client.get.mockResolvedValue(null);
    redisMock.client.set.mockResolvedValue('OK');
  });

  it('falls back to the loader when Redis is not configured', async () => {
    const { cached } = await importCache();
    const loader = vi.fn().mockResolvedValue({ value: 'fresh' });

    await expect(cached('key', 30, loader)).resolves.toEqual({ value: 'fresh' });
    expect(loader).toHaveBeenCalledOnce();
    expect(redisMock.Redis).not.toHaveBeenCalled();
  });

  it('returns cached JSON on hit without calling the loader', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    redisMock.client.get.mockResolvedValue(JSON.stringify({ value: 'cached' }));

    const { cached } = await importCache();
    const loader = vi.fn().mockResolvedValue({ value: 'fresh' });

    await expect(cached('key', 30, loader)).resolves.toEqual({ value: 'cached' });
    expect(loader).not.toHaveBeenCalled();
  });

  it('writes loader results on miss with a TTL', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    const { cached } = await importCache();
    const loader = vi.fn().mockResolvedValue({ value: 'fresh' });

    await expect(cached('key', 45, loader)).resolves.toEqual({ value: 'fresh' });
    expect(redisMock.client.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ value: 'fresh' }),
      { ex: 45 }
    );
  });

  it('falls back to the loader when Redis reads or writes fail', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    redisMock.client.get.mockRejectedValue(new Error('redis offline'));
    redisMock.client.set.mockRejectedValue(new Error('redis offline'));

    const { cached } = await importCache();
    const loader = vi.fn().mockResolvedValue({ value: 'fresh' });

    await expect(cached('key', 30, loader)).resolves.toEqual({ value: 'fresh' });
    expect(loader).toHaveBeenCalledOnce();
  });
});

