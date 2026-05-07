import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as interactionsRepo from '@/lib/repos/reportInteractions';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';
import * as usersRepo from '@/lib/repos/users';
import { hidesReporterOnPublicSurfaces, redactPublicReporter } from '@/lib/reportPrivacy';

function scoreReport(report: reportsRepo.ReportRecord) {
  const reportScore = Math.abs(report.reportScore ?? report.baseScore ?? report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0);
  const stats = report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 };
  const createdAt = report.createdAt ? new Date(report.createdAt).getTime() : Date.now();
  const ageDays = Math.max(0, (Date.now() - createdAt) / (24 * 60 * 60 * 1000));
  const recency = Math.exp(-0.05 * ageDays);
  const engagement = Math.log(1 + stats.aligns + stats.opposes + stats.comments + stats.shares);
  return reportScore * (report.credibilityWeight ?? 1) * recency * Math.max(1, engagement);
}

function createdTime(report: { createdAt?: string; timestamp?: string }) {
  const value = report.createdAt ?? report.timestamp;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

/** Derives a deterministic sentiment from engagement totals. */
function classifyType(aligns: number, opposes: number): 'positive' | 'negative' {
  return aligns >= opposes ? 'positive' : 'negative';
}

import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'description']
  }
});

async function fetchTwitterLive() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      'https://api.twitter.com/2/tweets/search/recent?query=-is:retweet has:media&max_results=15&expansions=author_id,attachments.media_keys&user.fields=name,username,profile_image_url,verified&media.fields=url,preview_image_url,type&tweet.fields=created_at,public_metrics',
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
    );
    const data = await res.json();
    if (!data.data) {
      console.error('Twitter API returned no data or error:', data);
      return [];
    }

    const users = new Map((data.includes?.users || []).map((u: any) => [u.id, u]));
    const media = new Map((data.includes?.media || []).map((m: any) => [m.media_key, m]));

    return data.data.map((tweet: any) => {
      const author = (users.get(tweet.author_id) as any) || {};
      const mediaKey = tweet.attachments?.media_keys?.[0];
      const mediaObj = media.get(mediaKey) as any;
      
      let mediaItem = undefined;
      if (mediaObj) {
        if (mediaObj.type === 'video') {
           mediaItem = { type: 'video', url: mediaObj.preview_image_url || '' };
        } else {
           mediaItem = { type: 'image', url: mediaObj.url || mediaObj.preview_image_url };
        }
      }

      const aligns = tweet.public_metrics?.like_count || 0;
      const opposes = Math.floor(aligns * 0.1);
      return {
        _id: `twitter-${tweet.id}`,
        accountId: `twitter-${author.id}`,
        userId: 'system',
        type: classifyType(aligns, opposes),
        status: 'published',
        description: tweet.text,
        media: mediaItem,
        stats: {
          aligns,
          opposes,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0
        },
        createdAt: tweet.created_at || new Date().toISOString(),
        account: {
          username: author.username || 'unknown',
          displayName: author.name || 'Unknown User',
          avatarUrl: author.profile_image_url,
          platform: 'x',
          verified: author.verified || false
        },
        viewer: { vote: null, bookmarked: false }
      };
    });
  } catch (e) {
    console.error('Twitter fetch error', e);
    return [];
  }
}

async function fetchInstagramLive() {
  const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const version = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!token || !accountId) return [];

  try {
    const hashRes = await fetch(`https://graph.facebook.com/${version}/ig_hashtag_search?user_id=${accountId}&q=news&access_token=${token}`);
    const hashData = await hashRes.json();
    const hashId = hashData.data?.[0]?.id;
    if (!hashId) return [];

    const mediaRes = await fetch(`https://graph.facebook.com/${version}/${hashId}/recent_media?user_id=${accountId}&fields=id,media_type,media_url,caption,timestamp,like_count,comments_count&limit=15&access_token=${token}`, { next: { revalidate: 300 } });
    const mediaData = await mediaRes.json();
    if (!mediaData.data) return [];

    return mediaData.data.map((post: any) => {
      let mediaItem = undefined;
      if (post.media_type === 'VIDEO') {
        mediaItem = { type: 'video', url: post.media_url };
      } else {
        mediaItem = { type: 'image', url: post.media_url };
      }

      const aligns = post.like_count || 0;
      const opposes = Math.floor(aligns * 0.1);
      return {
        _id: `ig-${post.id}`,
        accountId: `ig-hashtag`,
        userId: 'system',
        type: classifyType(aligns, opposes),
        status: 'published',
        description: post.caption || 'Instagram Post',
        media: mediaItem,
        stats: {
          aligns,
          opposes,
          comments: post.comments_count || 0,
          shares: Math.floor(aligns * 0.05)
        },
        createdAt: post.timestamp || new Date().toISOString(),
        account: {
          username: 'instagram_news',
          displayName: 'Instagram Trending',
          avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
          platform: 'instagram',
          verified: true
        },
        viewer: { vote: null, bookmarked: false }
      };
    });
  } catch (e) {
    console.error('Instagram fetch error', e);
    return [];
  }
}

async function fetchFacebookLive() {
  const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN; 
  const version = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!token) return [];

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/cnn/posts?fields=id,message,full_picture,created_time,shares,likes.summary(true),comments.summary(true)&limit=10&access_token=${token}`, { next: { revalidate: 300 } });
    const data = await res.json();
    if (!data.data) return [];

    return data.data.map((post: any) => {
      const aligns = post.likes?.summary?.total_count || 0;
      const opposes = Math.floor(aligns * 0.1);
      return {
        _id: `fb-${post.id}`,
        accountId: `fb-cnn`,
        userId: 'system',
        type: classifyType(aligns, opposes),
        status: 'published',
        description: post.message || 'Facebook Post',
        media: post.full_picture ? { type: 'image', url: post.full_picture } : undefined,
        stats: {
          aligns,
          opposes,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0
        },
        createdAt: post.created_time || new Date().toISOString(),
        account: {
          username: 'cnn',
          displayName: 'CNN',
          avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg',
          platform: 'facebook',
          verified: true
        },
        viewer: { vote: null, bookmarked: false }
      };
    });
  } catch (e) {
    console.error('Facebook fetch error', e);
    return [];
  }
}

async function getLiveNews() {
  const [twitter, instagram, facebook] = await Promise.all([
    fetchTwitterLive(),
    fetchInstagramLive(),
    fetchFacebookLive()
  ]);

  const posts = [...twitter, ...instagram, ...facebook];
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'for_you';
  const user = await getCurrentUser();
  const settings = await siteSettingsRepo.get();

  const reports = await reportsRepo.listPublicFeed(75, siteSettingsRepo.publicFeedStatuses(settings));
  const accountIds = Array.from(new Set(reports.map((report) => report.accountId)));
  const reporterIds = Array.from(
    new Set(
      reports
        .filter((report) => !hidesReporterOnPublicSurfaces(report))
        .map((report) => report.reporterId)
        .filter(Boolean)
    )
  ) as string[];

  const [accounts, reporters] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(reporterIds.map((id) => usersRepo.findById(id)))
  ]);
  
  const accountMap = new Map(accounts.filter(Boolean).map((account) => [account!._id, account!]));
  const reporterMap = new Map(reporters.filter(Boolean).map((reporter) => [reporter!._id, reporter!]));

  let feed: any[] = reports
    .map((report) => ({
      ...report,
      account: accountMap.get(report.accountId) ?? null,
      reporter: !hidesReporterOnPublicSurfaces(report) && report.reporterId
        ? (reporterMap.get(report.reporterId) ?? null)
        : null,
      canRequestModeration: Boolean(user && report.reporterId === user._id)
    }))
    .filter((report) => report.account !== null);

  const liveNews = settings.liveFeedEnabled ? await getLiveNews() : [];

  if (filter === 'following') {
    const followedAccounts = new Set(user?.claimedAccounts ?? []);
    const followedUsers = new Set(user?.following ?? []);
    feed = feed.filter((report) => {
      const isAnonymousReport = hidesReporterOnPublicSurfaces(report);

      // Include reports about accounts the user follows, but never surface
      // anonymous reports in Following where they can be linked to a social graph.
      if (followedAccounts.has(report.accountId) && !isAnonymousReport) return true;

      // Include reports where a followed user owns the reported account
      // BUT exclude if this is an anonymous report — would leak identity
      if (
        report.account?.claimedBy &&
        followedUsers.has(report.account.claimedBy) &&
        !isAnonymousReport
      ) return true;

      // Include reports filed BY a followed user
      // only if reporter is not hidden (already had this gate)
      if (
        report.reporterId &&
        followedUsers.has(report.reporterId) &&
        !isAnonymousReport
      ) return true;

      return false;
    });
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

  feed = feed
    .filter((report) => !report.account?.platform || settings.enabledPlatforms.includes(report.account.platform))
    .sort((a, b) =>
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      createdTime(b) - createdTime(a)
    )
    .slice(0, 30);

  const viewerStates = await Promise.all(
    feed.map((report) =>
      (report._id.startsWith('news-') || report._id.startsWith('reddit-') || report._id.startsWith('twitter-') || report._id.startsWith('ig-') || report._id.startsWith('fb-'))
        ? Promise.resolve({ vote: null, bookmarked: false })
        : interactionsRepo.getViewerState(report._id, user?._id)
    )
  );

  return ok(
    feed.map((report, index) => ({
      ...(report._id.startsWith('news-') || report._id.startsWith('reddit-') || report._id.startsWith('twitter-') || report._id.startsWith('ig-') || report._id.startsWith('fb-')
        ? report
        : redactPublicReporter(report)),
      viewer: viewerStates[index]
    }))
  );
}
