/**
 * Sanitizes a redirect path to prevent open redirect attacks.
 * Only allows relative paths that don't point back to auth screens.
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/dashboard';
  // Must be a relative path starting with /
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard';
  // Block redirecting back to auth pages (infinite loop)
  if (/^\/(sign-in|sign-up|login)/.test(path)) return '/dashboard';
  return path;
}
