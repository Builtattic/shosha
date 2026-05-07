import type { MetadataRoute } from 'next';
import * as accountsRepo from '@/lib/repos/accounts';

const BASE_URL = 'https://www.noshosha.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ──────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      priority: 1.0,
      changeFrequency: 'weekly',
    },
    {
      url: `${BASE_URL}/leaderboard`,
      priority: 0.9,
      changeFrequency: 'daily', // scores change every Sunday + events
    },
    {
      url: `${BASE_URL}/about`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE_URL}/how-it-works`,
      priority: 0.8,
      changeFrequency: 'monthly',
    },
  ];

  // ── Profile pages ─────────────────────────────────────────
  // listAll(500) fetches up to 500 accounts ordered by score.
  // If you grow beyond 500, we'll add sitemap pagination later.
  let profilePages: MetadataRoute.Sitemap = [];

  try {
    const accounts = await accountsRepo.listAll(500);

    profilePages = accounts.map((account) => ({
      url: `${BASE_URL}/profile/${account._id}`,
      lastModified: account.updatedAt ? new Date(account.updatedAt) : new Date(),
      priority: 0.8,
      changeFrequency: 'daily' as const, // scores update frequently
    }));
  } catch (error) {
    // If the DB call fails, sitemap still works — just without profile pages.
    // Better than a broken sitemap.xml
    console.error('[sitemap] failed to fetch accounts:', error);
  }

  return [...staticPages, ...profilePages];
}