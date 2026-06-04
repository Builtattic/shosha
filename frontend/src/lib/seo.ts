/** Returns the canonical site URL (no trailing slash). */
export function siteUrl(): string {
  // In production, this should be the real domain.
  // Set VITE_SITE_URL in .env for the real value.
  return import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') ?? 'https://shoshaworld.com';
}
