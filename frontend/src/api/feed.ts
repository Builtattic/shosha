import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/feed';
import type { ApiResponse } from '@/types/common';
import type { FeedFilter, FeedReport } from '@/types/feed';
import type { FeedReportOut } from '@/types/report';

export function feedFilterToApi(filter: FeedFilter): 'all' | 'following' | 'near' | 'top' {
  switch (filter) {
    case 'following':
      return 'following';
    case 'near':
      return 'near';
    case 'top':
      return 'top';
    case 'for_you':
    default:
      return 'all';
  }
}

export function toFeedReport(r: FeedReportOut): FeedReport {
  return {
    id: r.id,
    type: r.type ?? 'negative',
    title: r.title,
    description: r.description,
    deed: r.deed,
    base_score: r.base_score,
    status: r.status,
    created_at: r.created_at,
    is_irl: r.is_irl,
    evidence_source_url: r.evidence_source_url,
    public_anonymous: false,
    media: (r.media_items ?? []).map((m) => ({
      url: m.url,
      thumbnail_url: m.thumbnail_url,
      media_type: m.media_type as 'image' | 'video',
    })),
    stats: {
      aligns: r.align_count ?? 0,
      opposes: r.oppose_count ?? 0,
      comments: r.comment_count ?? 0,
      shares: 0, // no backend source — FeedItem tracks share clicks locally
    },
    viewer: r.viewer_vote
      ? { vote: r.viewer_vote, bookmarked: false }
      : null,
    account: r.account,
    reporter: null,
    can_request_moderation: false,
    ai_verdict: r.ai_verdict,
    report_score: r.base_score,
  };
}

export interface FeedResponse {
  items: FeedReport[];
  next_cursor: string | null;
  empty_reason?: string | null;
}

const real = {
  getFeed: async (
    limit = 30,
    cursor?: string,
    filter: FeedFilter = 'for_you',
  ): Promise<ApiResponse<FeedResponse>> => {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        filter: feedFilterToApi(filter),
      });
      if (cursor) params.set('cursor', cursor);
      const response = await apiClient.get<{
        items: FeedReportOut[];
        next_cursor: string | null;
        empty_reason?: string | null;
      }>(`/feed?${params}`);
      return {
        ok: true,
        data: {
          items: response.data.items.map(toFeedReport),
          next_cursor: response.data.next_cursor,
          empty_reason: response.data.empty_reason ?? null,
        },
      };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },
};

export async function getFeed(
  limit = 30,
  cursor?: string,
  filter: FeedFilter = 'for_you',
): Promise<ApiResponse<FeedResponse>> {
  if (USE_MOCKS) {
    return mock.getFeed(limit, cursor);
  }
  return real.getFeed(limit, cursor, filter);
}
