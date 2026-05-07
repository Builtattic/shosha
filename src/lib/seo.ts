import type { AccountRecord } from '@/lib/repos/accounts';

export function siteUrl() {
  // Always use the canonical production URL for sitemaps and SEO tags.
  // Using VERCEL_URL causes GSC "URL not allowed" errors because the
  // sitemap outputs preview URLs instead of the verified domain.
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.noshosha.com';
}

export function profileSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function profilePath(account: Pick<AccountRecord, 'username' | 'displayName'>) {
  const slug = profileSlug(account.username || account.displayName);
  return slug ? `/${slug}` : '';
}

export function profileTitle(account: Pick<AccountRecord, 'displayName' | 'score'>) {
  return `${account.displayName} Shosha Score: ${Math.round(account.score)}`;
}

export function profileDescription(account: Pick<AccountRecord, 'displayName' | 'bio' | 'score'>) {
  const bio = account.bio?.trim();
  if (bio) return bio.slice(0, 155);
  return `View ${account.displayName}'s public Shosha dossier, impact ledger, filings, and live score.`;
}
