import type { MetadataRoute } from 'next';
import * as accountsRepo from '@/lib/repos/accounts';
import { profilePath, siteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const now = new Date();
  const staticPaths = ['/', '/leaderboard', '/ranks', '/how-it-works', '/impact'];

  let profileUrls: MetadataRoute.Sitemap = [];
  try {
    const accounts = await accountsRepo.listEvery();
    profileUrls = accounts
      .map((account) => {
        const path = profilePath(account);
        if (!path) return null;
        return {
          url: `${baseUrl}${path}`,
          lastModified: account.updatedAt ? new Date(account.updatedAt) : now,
          changeFrequency: 'daily' as const,
          priority: account.profileKind === 'public_figure' ? 0.9 : 0.7,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch (error) {
    console.error('[sitemap] failed to load profile URLs', error);
  }

  return [
    ...staticPaths.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: path === '/' ? 1 : 0.8,
    })),
    ...profileUrls,
  ];
}
