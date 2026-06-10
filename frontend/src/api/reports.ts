import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import { toFeedReport } from '@/api/feed';
import * as mock from '@/mocks/reports';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';
import type { ReportCreatePayload, ReportOut } from '@/types/report';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    photo_url: string | null;
  };
}

export interface VoteAggregates {
  align_count: number;
  oppose_count: number;
}

export interface ModerationQueueItem {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  media?: { media_type: string; url: string; thumbnail_url?: string } | null;
  account: { id: string; platform: string; handle: string; display_name?: string | null };
  reporter: { id: string; username: string; display_name?: string | null } | null;
}

export type VoteType = 'ALIGN' | 'OPPOSE';
export type ModerationDecision = 'APPROVED' | 'REJECTED' | 'REMOVED';

// ── Real API ───────────────────────────────────────────────────────────────────

const real = {
  getReport: async (id: string): Promise<ApiResponse<FeedReport>> => {
    try {
      const response = await apiClient.get<{ report: ReportOut }>(`/reports/${id}`);
      return { ok: true, data: toFeedReport(response.data.report) };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  listReports: async (params: {
    account_id?: string;
    reporter_user_id?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ApiResponse<PaginatedResponse<FeedReport>>> => {
    try {
      const qp = new URLSearchParams();
      if (params.account_id) qp.set('account_id', params.account_id);
      if (params.reporter_user_id) qp.set('reporter_user_id', params.reporter_user_id);
      if (params.status) qp.set('status', params.status);
      qp.set('limit', String(params.limit ?? 20));
      if (params.cursor) qp.set('cursor', params.cursor);
      const response = await apiClient.get<{ items: ReportOut[]; next_cursor: string | null }>(
        `/reports?${qp}`,
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

  submitReport: async (
    payload: ReportCreatePayload,
  ): Promise<ApiResponse<{ report: ReportOut }>> => {
    try {
      const response = await apiClient.post<{ report: ReportOut }>('/reports', payload);
      return { ok: true, data: response.data };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  postVote: async (
    reportId: string,
    voteType: VoteType,
  ): Promise<ApiResponse<{ vote: { vote_type: VoteType }; aggregates: VoteAggregates }>> => {
    try {
      const response = await apiClient.post(`/reports/${reportId}/votes`, { vote_type: voteType });
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getComments: async (
    reportId: string,
    cursor?: string,
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    try {
      const qp = new URLSearchParams({ limit: '30' });
      if (cursor) qp.set('cursor', cursor);
      const response = await apiClient.get(`/reports/${reportId}/comments?${qp}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  postComment: async (
    reportId: string,
    body: string,
  ): Promise<ApiResponse<Comment>> => {
    try {
      const response = await apiClient.post(`/reports/${reportId}/comments`, { body });
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  requestModeration: async (
    reportId: string,
    payload: { reason?: string; evidence_url?: string },
  ): Promise<ApiResponse<{ queued: boolean; report_status: string }>> => {
    try {
      const response = await apiClient.post(`/reports/${reportId}/moderation-request`, payload);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getModerationQueue: async (params?: {
    status?: string;
    platform?: string;
    sort?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ApiResponse<PaginatedResponse<ModerationQueueItem>>> => {
    try {
      const qp = new URLSearchParams();
      if (params?.status) qp.set('status', params.status);
      if (params?.platform) qp.set('platform', params.platform);
      if (params?.sort) qp.set('sort', params.sort);
      qp.set('limit', String(params?.limit ?? 20));
      if (params?.cursor) qp.set('cursor', params.cursor);
      const response = await apiClient.get(`/reports/moderation-queue?${qp}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  moderateReport: async (
    reportId: string,
    decision: ModerationDecision,
    note?: string,
  ): Promise<ApiResponse<{ report: FeedReport }>> => {
    try {
      const response = await apiClient.post<{ report: ReportOut }>(`/reports/${reportId}/moderate`, {
        decision,
        note,
      });
      return {
        ok: true,
        data: { report: toFeedReport(response.data.report) },
      };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  postInteraction: mock.postInteraction,
  getCommentsMock: mock.getComments,
};

// ── Exports ────────────────────────────────────────────────────────────────────

export const getReport          = USE_MOCKS ? mock.getReport          : real.getReport;
export const listReports        = USE_MOCKS ? mock.listReports        : real.listReports;
export const submitReport       = USE_MOCKS ? mock.submitReport       : real.submitReport;
export const postVote           = USE_MOCKS ? mock.postVote           : real.postVote;
export const getComments        = USE_MOCKS ? mock.getComments        : real.getComments;
export const postComment        = USE_MOCKS ? mock.postComment        : real.postComment;
export const requestModeration  = USE_MOCKS ? mock.requestModeration  : real.requestModeration;
export const getModerationQueue = USE_MOCKS ? mock.getModerationQueue : real.getModerationQueue;
export const moderateReport     = USE_MOCKS ? mock.moderateReport     : real.moderateReport;
export const postInteraction    = mock.postInteraction;
