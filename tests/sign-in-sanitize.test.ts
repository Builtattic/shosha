import { describe, expect, it } from 'vitest';
import { sanitizeRedirectPath } from '@/lib/sanitizeRedirectPath';

describe('sanitizeRedirectPath', () => {
  describe('null and empty inputs', () => {
    it('returns /dashboard for null', () => {
      expect(sanitizeRedirectPath(null)).toBe('/dashboard');
    });

    it('returns /dashboard for empty string', () => {
      expect(sanitizeRedirectPath('')).toBe('/dashboard');
    });
  });

  describe('non-slash prefix inputs', () => {
    it('returns /dashboard for relative paths without leading slash', () => {
      expect(sanitizeRedirectPath('profile')).toBe('/dashboard');
    });

    it('returns /dashboard for absolute URLs', () => {
      expect(sanitizeRedirectPath('https://evil.com')).toBe('/dashboard');
    });

    it('returns /dashboard for http:// URLs', () => {
      expect(sanitizeRedirectPath('http://evil.com/steal?token=abc')).toBe('/dashboard');
    });
  });

  describe('double-slash (protocol-relative) URLs', () => {
    it('returns /dashboard for protocol-relative URLs starting with //', () => {
      expect(sanitizeRedirectPath('//evil.com/phish')).toBe('/dashboard');
    });

    it('returns /dashboard for //evil.com with path', () => {
      expect(sanitizeRedirectPath('//evil.com/path/to/resource')).toBe('/dashboard');
    });
  });

  describe('scheme injection via path prefix', () => {
    it('returns /dashboard for /http: path (open redirect via scheme)', () => {
      expect(sanitizeRedirectPath('/http://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/http:evil.com')).toBe('/dashboard');
    });

    it('returns /dashboard for /https: path', () => {
      expect(sanitizeRedirectPath('/https://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/https:evil.com')).toBe('/dashboard');
    });

    it('returns /dashboard for /data: path (data URI injection)', () => {
      expect(sanitizeRedirectPath('/data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
    });

    it('returns /dashboard for /javascript: path (XSS via location)', () => {
      expect(sanitizeRedirectPath('/javascript:alert(1)')).toBe('/dashboard');
    });

    it('is case-insensitive for scheme detection', () => {
      expect(sanitizeRedirectPath('/HTTP://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/HTTPS://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/DATA:text/html,x')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/JAVASCRIPT:alert(1)')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/JavaScript:alert(1)')).toBe('/dashboard');
    });
  });

  describe('valid redirect paths', () => {
    it('returns /dashboard as-is', () => {
      expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
    });

    it('returns /profile as-is', () => {
      expect(sanitizeRedirectPath('/profile')).toBe('/profile');
    });

    it('returns /onboard as-is', () => {
      expect(sanitizeRedirectPath('/onboard')).toBe('/onboard');
    });

    it('returns nested paths as-is', () => {
      expect(sanitizeRedirectPath('/settings/account')).toBe('/settings/account');
    });

    it('returns paths with query strings as-is', () => {
      expect(sanitizeRedirectPath('/search?q=test')).toBe('/search?q=test');
    });

    it('returns paths with hash fragments as-is', () => {
      expect(sanitizeRedirectPath('/page#section')).toBe('/page#section');
    });

    it('returns a single slash as-is', () => {
      expect(sanitizeRedirectPath('/')).toBe('/');
    });
  });

  describe('boundary and regression cases', () => {
    it('does not block /https-tutorial (only /https: prefix)', () => {
      // /https-tutorial does NOT start with /https: so it should pass
      expect(sanitizeRedirectPath('/https-tutorial')).toBe('/https-tutorial');
    });

    it('does not block /data-export (only /data: prefix)', () => {
      expect(sanitizeRedirectPath('/data-export')).toBe('/data-export');
    });

    it('does not block /javascript-guide (only /javascript: prefix)', () => {
      expect(sanitizeRedirectPath('/javascript-guide')).toBe('/javascript-guide');
    });
  });
});
