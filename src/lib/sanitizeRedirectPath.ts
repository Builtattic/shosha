/** Allows only safe same-origin relative redirect targets. */
export function sanitizeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/') || input.startsWith('//')) return '/dashboard';
  const lowered = input.toLowerCase();
  if (lowered.startsWith('/http:') || lowered.startsWith('/https:') || lowered.startsWith('/data:') || lowered.startsWith('/javascript:')) {
    return '/dashboard';
  }
  return input;
}
