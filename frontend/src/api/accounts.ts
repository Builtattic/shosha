import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/accounts';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type {
  Account,
  AccountCreatePayload,
  AccountUpdatePayload,
  SocialLink,
} from '@/types/account';

export interface ReportListItem {
  id: string;
  title: string;
  description: string;
  deed: string | null;
  base_score: number | null;
  type: 'positive' | 'negative' | null;
  status: string;
  created_at: string;
}

export interface ScoreHistoryEntry {
  t: string;
  s: number;
  cause: string | null;
}

/** Window scores returned by the backend (snake_case from FastAPI). */
export interface WindowScoresRaw {
  base_score: number;
  w1_delta: number;
  w1_decay: number;
  w1_score: number;
  w2_delta: number;
  w2_decay: number;
  w2_score: number;
  w3_delta: number;
  w3_decay: number;
  w3_score: number;
  final_score: number;
}

// ── Real API ───────────────────────────────────────────────────────────────────

const real = {
  searchAccounts: async (q: string): Promise<ApiResponse<{ items: Account[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/search?q=${encodeURIComponent(q)}`);
      return { ok: true, data: { items: response.data.items ?? [] } };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  getAccount: async (id: string): Promise<ApiResponse<{ account: Account }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}`);
      return { ok: true, data: response.data };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  getAccountSocialLinks: async (id: string): Promise<ApiResponse<{ links: SocialLink[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}/social-links`);
      return { ok: true, data: response.data };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  listAccountReports: async (
    accountId: string,
    cursor?: string,
  ): Promise<ApiResponse<PaginatedResponse<ReportListItem>>> => {
    try {
      const params = new URLSearchParams({ account_id: accountId, status: 'APPROVED', limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await apiClient.get(`/reports?${params}`);
      return { ok: true, data: response.data };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  createAccount: async (
    payload: AccountCreatePayload,
  ): Promise<ApiResponse<{ account: Account }>> => {
    try {
      const response = await apiClient.post('/accounts', payload);
      return { ok: true, data: response.data };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  listAccounts: async (
    limit = 50,
    cursor?: string,
    ownerUserId?: string,
  ): Promise<{ items: Account[]; next_cursor: string | null }> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (ownerUserId) params.set('owner_user_id', ownerUserId);
    const res = await apiClient.get(`/accounts/?${params}`);
    return res.data;
  },

  updateAccount: async (accountId: string, payload: AccountUpdatePayload): Promise<Account> => {
    const res = await apiClient.patch(`/accounts/${accountId}`, payload);
    return res.data.account;
  },

  addSocialLink: async (
    accountId: string,
    platform: string,
    url: string,
  ): Promise<SocialLink> => {
    const res = await apiClient.post(`/accounts/${accountId}/social-links`, {
      platform,
      url,
      is_verified: false,
    });
    return res.data.link;
  },

  getAccountScoreHistory: async (
    id: string,
  ): Promise<ApiResponse<{ history: ScoreHistoryEntry[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}/score-history`);
      return { ok: true, data: { history: response.data.history ?? [] } };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },

  getAccountScoreWindows: async (
    id: string,
  ): Promise<ApiResponse<{ window_scores: WindowScoresRaw | null }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}/score-windows`);
      return { ok: true, data: { window_scores: response.data.window_scores ?? null } };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : 'Request failed' };
    }
  },
};

// ── Exports ────────────────────────────────────────────────────────────────────

export const searchAccounts = USE_MOCKS ? mock.searchAccounts : real.searchAccounts;
export const getAccount = USE_MOCKS ? mock.getAccount : real.getAccount;
export const getAccountSocialLinks = USE_MOCKS ? mock.getAccountSocialLinks : real.getAccountSocialLinks;
export const listAccountReports = USE_MOCKS ? mock.listAccountReports : real.listAccountReports;
export const createAccount = USE_MOCKS ? mock.createAccount : real.createAccount;
export const listAccounts = USE_MOCKS ? mock.listAccounts : real.listAccounts;
export const updateAccount = USE_MOCKS ? mock.updateAccount : real.updateAccount;
export const addSocialLink = USE_MOCKS ? mock.addSocialLink : real.addSocialLink;
export const getAccountScoreHistory = USE_MOCKS ? mock.getAccountScoreHistory : real.getAccountScoreHistory;
export const getAccountScoreWindows = USE_MOCKS ? mock.getAccountScoreWindows : real.getAccountScoreWindows;
