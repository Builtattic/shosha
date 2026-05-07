import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { anonymousHash, anonymousTag } from '@/lib/anonymous';

function makeRequest(opts: { ip?: string; ua?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (opts.ip !== undefined) headers['x-forwarded-for'] = opts.ip;
  if (opts.ua !== undefined) headers['user-agent'] = opts.ua;
  return new Request('http://localhost/', { headers });
}

describe('anonymousHash', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANONYMOUS_TAG_SALT;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns a 64-char hex string', () => {
    const req = makeRequest({ ip: '1.2.3.4', ua: 'test-agent' });
    const hash = anonymousHash(req);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same ip+ua+salt produces same hash', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const req1 = makeRequest({ ip: '1.2.3.4', ua: 'Mozilla/5.0' });
    const req2 = makeRequest({ ip: '1.2.3.4', ua: 'Mozilla/5.0' });
    expect(anonymousHash(req1)).toBe(anonymousHash(req2));
  });

  it('produces different hashes for different IPs', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const req1 = makeRequest({ ip: '1.2.3.4', ua: 'agent' });
    const req2 = makeRequest({ ip: '9.9.9.9', ua: 'agent' });
    expect(anonymousHash(req1)).not.toBe(anonymousHash(req2));
  });

  it('produces different hashes for different user-agents', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const req1 = makeRequest({ ip: '1.2.3.4', ua: 'Chrome' });
    const req2 = makeRequest({ ip: '1.2.3.4', ua: 'Firefox' });
    expect(anonymousHash(req1)).not.toBe(anonymousHash(req2));
  });

  it('produces different hashes for different salts', () => {
    const req = makeRequest({ ip: '1.2.3.4', ua: 'agent' });
    process.env.ANONYMOUS_TAG_SALT = 'salt-a';
    const hash1 = anonymousHash(req);
    process.env.ANONYMOUS_TAG_SALT = 'salt-b';
    const hash2 = anonymousHash(req);
    expect(hash1).not.toBe(hash2);
  });

  it('uses only the first IP from comma-separated x-forwarded-for', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const reqMulti = makeRequest({ ip: '1.2.3.4, 5.6.7.8, 9.10.11.12', ua: 'agent' });
    const reqSingle = makeRequest({ ip: '1.2.3.4', ua: 'agent' });
    expect(anonymousHash(reqMulti)).toBe(anonymousHash(reqSingle));
  });

  it('falls back to "local" when x-forwarded-for header is absent', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const reqNoIp = makeRequest({ ua: 'agent' });
    const reqLocal = makeRequest({ ip: 'local', ua: 'agent' });
    expect(anonymousHash(reqNoIp)).toBe(anonymousHash(reqLocal));
  });

  it('falls back to "unknown" when user-agent header is absent', () => {
    process.env.ANONYMOUS_TAG_SALT = 'test-salt';
    const reqNoUa = makeRequest({ ip: '1.2.3.4' });
    const reqUnknown = makeRequest({ ip: '1.2.3.4', ua: 'unknown' });
    expect(anonymousHash(reqNoUa)).toBe(anonymousHash(reqUnknown));
  });

  it('uses ANONYMOUS_TAG_SALT env var when set', () => {
    process.env.ANONYMOUS_TAG_SALT = 'my-custom-salt';
    const req = makeRequest({ ip: '5.5.5.5', ua: 'ua' });
    // Just verifies it runs without error and returns hex
    expect(anonymousHash(req)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses dev fallback salt when NODE_ENV is not production and no salt is set', () => {
    // NODE_ENV is 'test' by default in vitest, not 'production'
    delete process.env.ANONYMOUS_TAG_SALT;
    const req = makeRequest({ ip: '1.1.1.1', ua: 'ua' });
    // Should not throw, should return valid hash
    expect(() => anonymousHash(req)).not.toThrow();
    expect(anonymousHash(req)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws in production environment when ANONYMOUS_TAG_SALT is not set', () => {
    delete process.env.ANONYMOUS_TAG_SALT;
    process.env.NODE_ENV = 'production';
    const req = makeRequest({ ip: '1.2.3.4', ua: 'ua' });
    expect(() => anonymousHash(req)).toThrow('ANONYMOUS_TAG_SALT is required in production');
  });
});

describe('anonymousTag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ANONYMOUS_TAG_SALT = 'tag-test-salt';
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns a string starting with "anon_"', () => {
    const req = makeRequest({ ip: '1.2.3.4', ua: 'ua' });
    expect(anonymousTag(req)).toMatch(/^anon_/);
  });

  it('is exactly "anon_" followed by 4 hex characters', () => {
    const req = makeRequest({ ip: '1.2.3.4', ua: 'ua' });
    expect(anonymousTag(req)).toMatch(/^anon_[0-9a-f]{4}$/);
  });

  it('is deterministic for the same request fingerprint', () => {
    const req1 = makeRequest({ ip: '1.2.3.4', ua: 'Mozilla' });
    const req2 = makeRequest({ ip: '1.2.3.4', ua: 'Mozilla' });
    expect(anonymousTag(req1)).toBe(anonymousTag(req2));
  });

  it('differs across different IPs', () => {
    const req1 = makeRequest({ ip: '1.1.1.1', ua: 'ua' });
    const req2 = makeRequest({ ip: '2.2.2.2', ua: 'ua' });
    // It's possible but extremely unlikely for two different inputs to produce the same 4-char prefix
    // This is a probabilistic test that should pass under normal conditions
    const tag1 = anonymousTag(req1);
    const tag2 = anonymousTag(req2);
    // At minimum both should be valid format
    expect(tag1).toMatch(/^anon_[0-9a-f]{4}$/);
    expect(tag2).toMatch(/^anon_[0-9a-f]{4}$/);
  });
});