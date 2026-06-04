import type { ApiResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';
import { MOCK_FEED_REPORTS } from '@/mocks/feed';

export async function getReport(id: string): Promise<ApiResponse<FeedReport>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const report = MOCK_FEED_REPORTS.find((r) => r._id === id);
  if (!report) {
    return { ok: false, error: 'Report not found' };
  }
  return { ok: true, data: report };
}

export async function postInteraction(
  _reportId: string,
  _action: 'align' | 'oppose' | 'share' | 'bookmark' | 'comment',
  _extras?: Record<string, unknown>,
): Promise<ApiResponse<{ stats?: FeedReport['stats']; vote?: string | null; bookmarked?: boolean }>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: {} };
}

export async function getComments(
  _reportId: string,
): Promise<ApiResponse<{ id: string; text: string; createdAt: string; author: { id: string; name: string; username: string; avatar: string } }[]>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { ok: true, data: [] };
}
