import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/feed';
import type { ApiResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';
import type { ReportOut } from '@/types/report';

export function toFeedReport(r: ReportOut): FeedReport {
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
    // TODO: enrich feed with vote aggregates when backend exposes them
    stats: { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    viewer: null,
    account: r.account,
    reporter: null,
    can_request_moderation: false,
    ai_verdict: r.ai_verdict,
    report_score: r.base_score,
  };
}

const real = {
  getFeed: async (
    limit = 30,
    cursor?: string,
  ): Promise<ApiResponse<{ items: FeedReport[]; next_cursor: string | null }>> => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      const response = await apiClient.get<{ items: ReportOut[]; next_cursor: string | null }>(
        `/feed?${params}`,
      );
      return {
        ok: true,
        data: {
          items: response.data.items.map(toFeedReport),
          next_cursor: response.data.next_cursor,
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
): Promise<ApiResponse<{ items: FeedReport[]; next_cursor: string | null }>> {
  if (USE_MOCKS) {
    return mock.getFeed(limit, cursor);
  }
  return real.getFeed(limit, cursor);
}
