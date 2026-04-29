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

const MOCK_ACCOUNTS = [
  { username: 'elonmusk', displayName: 'Elon Musk', avatarUrl: 'https://pbs.twimg.com/profile_images/1780044485541699584/p78MCn3B_400x400.jpg', platform: 'twitter' },
  { username: 'zuck', displayName: 'Mark Zuckerberg', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg', platform: 'threads' },
  { username: 'cristiano', displayName: 'Cristiano Ronaldo', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg', platform: 'instagram' },
  { username: 'mrbeast', displayName: 'MrBeast', avatarUrl: 'https://pbs.twimg.com/profile_images/994592419705274369/b_E12vD5_400x400.jpg', platform: 'twitter' },
  { username: 'meta', displayName: 'Meta', avatarUrl: 'https://pbs.twimg.com/profile_images/1453818753880190978/hzjmBsqW_400x400.jpg', platform: 'facebook' },
  { username: 'taylorswift', displayName: 'Taylor Swift', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png', platform: 'instagram' },
  { username: 'mosseri', displayName: 'Adam Mosseri', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Adam_Mosseri_at_the_2019_Web_Summit_%28cropped%29.jpg', platform: 'threads' }
];

const SUBREDDITS = [
  { name: 'popculturechat', platform: 'instagram' },
  { name: 'WhitePeopleTwitter', platform: 'twitter' },
  { name: 'InstagramReality', platform: 'instagram' },
  { name: 'NonPoliticalTwitter', platform: 'twitter' }
];

async function getLiveNews() {
  try {
    const allPosts = await Promise.all(
      SUBREDDITS.map(async (sub) => {
        const res = await fetch(`https://www.reddit.com/r/${sub.name}/hot.json?limit=15`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
          },
          next: { revalidate: 3600 }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data?.children || []).map((child: any) => ({ ...child.data, _platform: sub.platform }));
      })
    );

    const posts = allPosts.flat().sort((a, b) => b.created_utc - a.created_utc);

    return posts.filter(post => !post.is_self && post.url).map((post, index) => {
      const isPositive = Math.random() > 0.4;
      const accountMock = MOCK_ACCOUNTS[index % MOCK_ACCOUNTS.length];
      
      let media = undefined;
      const redditPreview = post.preview?.images?.[0]?.source?.url?.replaceAll('&amp;', '&');
      
      if (post.is_video && post.media?.reddit_video?.fallback_url) {
        media = { type: 'video' as const, url: post.media.reddit_video.fallback_url };
      } else if (redditPreview) {
        media = { type: 'image' as const, url: redditPreview };
      } else if (post.url && (post.url.includes('.jpg') || post.url.includes('.png') || post.url.includes('.webp'))) {
        media = { type: 'image' as const, url: post.url };
      } else if (post.thumbnail && post.thumbnail.startsWith('http')) {
        media = { type: 'image' as const, url: post.thumbnail };
      }

      return {
        _id: `reddit-${post.id}-${Date.now()}`,
        accountId: `mock-${accountMock.username}`,
        userId: 'system',
        type: isPositive ? 'positive' : 'negative',
        status: 'published',
        description: post.title,
        media: media,
        stats: {
          aligns: post.ups || Math.floor(Math.random() * 1000),
          opposes: Math.floor(post.ups * 0.1) || Math.floor(Math.random() * 100),
          comments: post.num_comments || Math.floor(Math.random() * 50),
          shares: Math.floor(post.ups * 0.05) || Math.floor(Math.random() * 20)
        },
        adminDecision: { finalImpact: isPositive ? Math.floor(Math.random() * 10) + 1 : -(Math.floor(Math.random() * 10) + 1) },
        createdAt: new Date(post.created_utc * 1000).toISOString(),
        account: {
          username: accountMock.username,
          displayName: accountMock.displayName,
          avatarUrl: accountMock.avatarUrl,
          platform: post._platform || accountMock.platform,
          verified: true
        },
        viewer: { vote: null, bookmarked: false }
      };
    });
  } catch (e) {
    console.error('Failed to fetch live news from Reddit:', e);
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
    feed.map((report) => 
      (report._id.startsWith('news-') || report._id.startsWith('reddit-')) 
        ? Promise.resolve({ vote: null, bookmarked: false }) 
        : interactionsRepo.getViewerState(report._id, user?._id)
    )
  );

  return ok(
    feed.slice(0, 30).map((report, index) => ({
      ...report,
      viewer: viewerStates[index]
    }))
  );
}
