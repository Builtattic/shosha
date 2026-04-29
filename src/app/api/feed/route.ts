import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as interactionsRepo from '@/lib/repos/reportInteractions';

function scoreReport(report: reportsRepo.ReportRecord) {
  const impact = Math.abs(report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0);
  const stats = report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 };
  return impact * 100 + stats.aligns + stats.opposes + stats.comments * 2 + stats.shares * 3;
}

import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'description']
  }
});

async function getLiveNews() {
  try {
    const res = await fetch('https://techcrunch.com/category/social/feed/', {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    return feed.items.map((item, index) => {
      const isPositive = Math.random() > 0.5;
      
      let imageUrl = undefined;
      if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        imageUrl = item['media:content']['$'].url;
      } else if (item.content) {
         // rough extraction of image from content html
         const match = item.content.match(/<img[^>]+src="([^">]+)"/);
         if (match) imageUrl = match[1];
      }

      return {
        _id: `news-${index}-${Date.now()}`,
        accountId: 'techcrunch-social',
        userId: 'system',
        type: isPositive ? 'positive' : 'negative',
        status: 'published',
        description: item.title || 'Social Media Update',
        media: imageUrl ? { type: 'image', url: imageUrl } : undefined,
        stats: {
          aligns: Math.floor(Math.random() * 500) + 50,
          opposes: Math.floor(Math.random() * 100) + 10,
          comments: Math.floor(Math.random() * 50) + 5,
          shares: Math.floor(Math.random() * 30) + 2
        },
        adminDecision: { finalImpact: isPositive ? Math.floor(Math.random() * 5) + 1 : -(Math.floor(Math.random() * 5) + 1) },
        createdAt: item.pubDate || new Date().toISOString(),
        account: {
          username: 'TechCrunch',
          displayName: 'TechCrunch Social',
          avatarUrl: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon.png',
          verified: true
        },
        viewer: { vote: null, bookmarked: false }
      };
    });
  } catch (e) {
    console.error('Failed to fetch live news:', e);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'for_you';
  const user = await getCurrentUser();

  const reports = await reportsRepo.listPublicFeed(75);
  const accountIds = Array.from(new Set(reports.map((report) => report.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((account) => [account!._id, account!]));

  let feed: any[] = reports
    .map((report) => ({ ...report, account: accountMap.get(report.accountId) ?? null }))
    .filter((report) => report.account !== null);

  // Fetch live news to augment the feed
  const liveNews = await getLiveNews();

  if (filter === 'following') {
    const followed = new Set(user?.claimedAccounts ?? []);
    feed = feed.filter((report) => followed.has(report.accountId));
  } else {
    // Append news for non-following tabs
    feed = [...feed, ...liveNews] as any[];
  }

  if (filter === 'top') {
    feed = feed.sort((a, b) => scoreReport(b as any) - scoreReport(a as any));
  } else if (filter === 'positive') {
    feed = feed.filter((report) => report.type === 'positive');
  } else if (filter === 'negative') {
    feed = feed.filter((report) => report.type === 'negative');
  } else if (filter === 'near') {
    feed = feed.filter((report) => report.account?.platform === 'instagram');
  }

  const viewerStates = await Promise.all(
    feed.map((report) => report._id.startsWith('news-') ? Promise.resolve({ vote: null, bookmarked: false }) : interactionsRepo.getViewerState(report._id, user?._id))
  );

  return ok(
    feed.slice(0, 30).map((report, index) => ({
      ...report,
      viewer: viewerStates[index]
    }))
  );
}
