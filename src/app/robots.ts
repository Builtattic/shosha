import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/profile/',   // public SEO profile pages
          '/leaderboard',
          '/about',
          '/how-it-works',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/settings/',
          '/onboard/',
          '/dashboard/',
          '/feed/',
          '/disputes/',
          '/notifications/',
          '/bookmarks/',
          '/search/',
          '/profile/edit/',
          '/profile/upgrade/',
          '/account/',   // auth-gated app version — block to avoid duplicate content
        ],
      },
    ],
    sitemap: 'https://www.noshosha.com/sitemap.xml',
  };
}