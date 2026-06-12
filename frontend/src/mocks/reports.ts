import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';
import type { ReportCreatePayload, ReportOut } from '@/types/report';
import type { Comment, VoteType, ModerationQueueItem, VoteAggregates } from '@/api/reports';
import { MOCK_FEED_REPORTS } from '@/mocks/feed';

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'cmt_001',
    report_id: 'rep_001',
    user_id: 'usr_001',
    body: 'This is exactly the kind of accountability Shosha is built for. Verified this myself — the clean-up happened over three consecutive weekends.',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    author: {
      id: 'usr_001',
      username: 'nitya_v',
      display_name: 'Nitya Verma',
      photo_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Nitya',
    },
  },
  {
    id: 'cmt_002',
    report_id: 'rep_001',
    user_id: 'usr_002',
    body: 'I was one of the 80 volunteers. Can confirm. The organiser also covered all logistics out of pocket.',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    author: { id: 'usr_002', username: 'rk_photos', display_name: 'Raj K', photo_url: null },
  },
];

const MOCK_QUEUE: ModerationQueueItem[] = MOCK_FEED_REPORTS.slice(0, 3).map((r, i) => ({
  id: r.id,
  title: `Report #${i + 1}: ${r.deed ?? r.category ?? 'Uncategorised'}`,
  description: r.description,
  status: 'PENDING',
  created_at: r.created_at,
  media: r.media[0]
    ? {
        media_type: r.media[0].media_type,
        url: r.media[0].url,
        thumbnail_url: r.media[0].thumbnail_url ?? undefined,
      }
    : null,
  account: {
    id: r.account?.id ?? '',
    platform: r.account?.platform ?? 'X',
    handle: r.account?.handle ?? '',
    display_name: r.account?.display_name ?? null,
  },
  reporter: r.reporter
    ? {
        id: r.reporter.id,
        username: r.reporter.username,
        display_name: r.reporter.display_name,
      }
    : null,
}));

export async function getReport(id: string): Promise<ApiResponse<FeedReport>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const report = MOCK_FEED_REPORTS.find((r) => r.id === id);
  if (!report) return { ok: false, error: 'Report not found' };
  return { ok: true, data: report };
}

export async function listReports(params: {
  account_id?: string;
  reporter_user_id?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<ApiResponse<PaginatedResponse<FeedReport>>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  let items = [...MOCK_FEED_REPORTS];
  if (params.account_id) {
    items = items.filter((r) => r.account?.id === params.account_id);
  }
  return { ok: true, data: { items: items.slice(0, params.limit ?? 20), next_cursor: null } };
}

export async function submitReport(
  payload: ReportCreatePayload,
): Promise<ApiResponse<{ report: ReportOut }>> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const fake: ReportOut = {
    id: `rep_new_${Date.now()}`,
    account_id: payload.account_id,
    reporter_user_id: 'usr_mock',
    status: 'PENDING',
    title: payload.title,
    description: payload.description,
    deed: payload.title,
    base_score: null,
    type: payload.type,
    is_irl: payload.is_irl,
    evidence_source_url: payload.evidence_source_url ?? null,
    ai_verdict: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
    media_items: (payload.media ?? []).map((m, i) => ({
      id: `media_${i}`,
      media_type: m.media_type,
      url: m.url,
      thumbnail_url: m.thumbnail_url ?? null,
    })),
    account: {
      id: payload.account_id,
      platform: 'website',
      handle: 'account',
      display_name: 'Account',
      score: 1000,
    },
  };
  return { ok: true, data: { report: fake } };
}

export async function postVote(
  reportId: string,
  voteType: VoteType,
): Promise<ApiResponse<{ vote: { vote_type: VoteType }; aggregates: VoteAggregates }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  void reportId;
  return {
    ok: true,
    data: {
      vote: { vote_type: voteType },
      aggregates: { align_count: 50, oppose_count: 5 },
    },
  };
}

export async function getComments(
  reportId: string,
  _cursor?: string,
): Promise<ApiResponse<PaginatedResponse<Comment>>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const items = MOCK_COMMENTS.filter((c) => c.report_id === reportId);
  return { ok: true, data: { items, next_cursor: null } };
}

export async function postComment(
  reportId: string,
  body: string,
): Promise<ApiResponse<Comment>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    ok: true,
    data: {
      id: `cmt_new_${Date.now()}`,
      report_id: reportId,
      user_id: 'usr_mock123',
      body,
      created_at: new Date().toISOString(),
      author: { id: 'usr_mock123', username: 'you', display_name: 'You', photo_url: null },
    },
  };
}

export async function requestModeration(
  reportId: string,
  _payload: { reason?: string; evidence_url?: string },
): Promise<ApiResponse<{ queued: boolean; report_status: string }>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  void reportId;
  return { ok: true, data: { queued: true, report_status: 'PENDING' } };
}

export async function getModerationQueue(
  _params?: {
    status?: string;
    platform?: string;
    sort?: string;
    limit?: number;
    cursor?: string;
  },
): Promise<ApiResponse<PaginatedResponse<ModerationQueueItem>>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ok: true, data: { items: MOCK_QUEUE, next_cursor: null } };
}

export async function moderateReport(
  reportId: string,
  _decision: string,
  _note?: string,
  _scoring?: Record<string, unknown>,
): Promise<ApiResponse<{ report: FeedReport }>> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const report = MOCK_FEED_REPORTS.find((r) => r.id === reportId) ?? MOCK_FEED_REPORTS[0];
  return { ok: true, data: { report } };
}

export async function postInteraction(
  _reportId: string,
  _action: 'align' | 'oppose' | 'share' | 'bookmark' | 'comment',
  _extras?: Record<string, unknown>,
): Promise<ApiResponse<{ stats?: FeedReport['stats']; vote?: string | null; bookmarked?: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: {} };
}

const mockBookmarkState = new Map<string, boolean>();

export async function toggleBookmark(
  reportId: string,
): Promise<ApiResponse<{ bookmarked: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const next = !mockBookmarkState.get(reportId);
  mockBookmarkState.set(reportId, next);
  return { ok: true, data: { bookmarked: next } };
}
