import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// We import the route handler after setting up the env.
// ALLOWED_IMAGE_HOSTS is read at module init time from PROXY_IMAGE_ALLOWED_HOSTS env var.

function makeFetchResponse(opts: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  body?: ArrayBuffer;
} = {}) {
  const { ok = true, status = 200, statusText = 'OK', contentType = 'image/jpeg', body = new ArrayBuffer(8) } = opts;
  return {
    ok,
    status,
    statusText,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    arrayBuffer: async () => body,
  };
}

function makeRequest(url: string): Request {
  return new Request(url);
}

describe('proxy-image GET route', () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.PROXY_IMAGE_ALLOWED_HOSTS;
    const mod = await import('@/app/api/proxy-image/route');
    GET = mod.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PROXY_IMAGE_ALLOWED_HOSTS;
  });

  describe('missing or invalid url parameter', () => {
    it('returns 400 when url parameter is missing', async () => {
      const req = makeRequest('http://localhost/api/proxy-image');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain('Missing url parameter');
    });

    it('returns 400 for a malformed URL', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=not-a-url');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain('Invalid url parameter');
    });
  });

  describe('protocol enforcement', () => {
    it('rejects http:// URLs', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=http://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain('Disallowed image URL');
    });

    it('rejects ftp:// URLs', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=ftp://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('accepts https:// URLs for non-private hosts', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe('private host blocking', () => {
    it('rejects localhost', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://localhost/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(await res.text()).toContain('Disallowed image URL');
    });

    it('rejects 127.0.0.1', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://127.0.0.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects ::1 (IPv6 loopback)', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://[::1]/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects 10.x.x.x private range', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://10.0.0.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects 192.168.x.x private range', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://192.168.1.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects 172.16.x.x private range', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://172.16.0.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects 172.31.x.x private range (upper boundary)', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://172.31.255.255/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('allows 172.32.x.x (just outside private range)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://172.32.0.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('rejects 169.254.x.x link-local range', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://169.254.1.1/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects .local hostnames', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://myserver.local/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects .internal hostnames', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://metadata.internal/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('rejects 127.x.x.x range (entire loopback block)', async () => {
      const req = makeRequest('http://localhost/api/proxy-image?url=https://127.0.0.2/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe('content-type validation', () => {
    it('returns 415 when upstream returns non-image content-type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'text/html' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/page.html');
      const res = await GET(req);
      expect(res.status).toBe(415);
      expect(await res.text()).toContain('Only image content is allowed');
    });

    it('returns 415 when upstream returns application/json', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'application/json' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/data.json');
      const res = await GET(req);
      expect(res.status).toBe(415);
    });

    it('accepts image/png content-type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'image/png' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.png');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('accepts image/webp content-type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'image/webp' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.webp');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('is case-insensitive for content-type check', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'Image/JPEG' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe('upstream fetch failures', () => {
    it('returns 500 when upstream fetch returns non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ ok: false, status: 404, statusText: 'Not Found' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/missing.jpg');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it('returns 500 when upstream fetch throws a generic error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe('successful proxy response', () => {
    it('returns 200 with correct Content-Type header', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse({ contentType: 'image/jpeg' })));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    });

    it('sets Cache-Control header on successful response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    });

    it('does not expose Access-Control-Allow-Origin header (removed in PR)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const req = makeRequest('http://localhost/api/proxy-image?url=https://example.com/image.jpg');
      const res = await GET(req);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('allowlist mode (PROXY_IMAGE_ALLOWED_HOSTS set)', () => {
    it('rejects hosts not in the allowlist', async () => {
      vi.resetModules();
      process.env.PROXY_IMAGE_ALLOWED_HOSTS = 'cdn.example.com,assets.example.com';
      const { GET: getAllowlisted } = await import('@/app/api/proxy-image/route');
      const req = makeRequest('http://localhost/api/proxy-image?url=https://other.com/image.jpg');
      const res = await getAllowlisted(req);
      expect(res.status).toBe(400);
    });

    it('allows hosts in the allowlist', async () => {
      vi.resetModules();
      process.env.PROXY_IMAGE_ALLOWED_HOSTS = 'cdn.example.com';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const { GET: getAllowlisted } = await import('@/app/api/proxy-image/route');
      const req = makeRequest('http://localhost/api/proxy-image?url=https://cdn.example.com/image.jpg');
      const res = await getAllowlisted(req);
      expect(res.status).toBe(200);
    });

    it('allowlist is case-insensitive', async () => {
      vi.resetModules();
      process.env.PROXY_IMAGE_ALLOWED_HOSTS = 'CDN.EXAMPLE.COM';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse()));
      const { GET: getAllowlisted } = await import('@/app/api/proxy-image/route');
      const req = makeRequest('http://localhost/api/proxy-image?url=https://cdn.example.com/image.jpg');
      const res = await getAllowlisted(req);
      expect(res.status).toBe(200);
    });
  });
});