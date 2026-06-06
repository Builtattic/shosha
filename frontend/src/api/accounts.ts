import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/accounts';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { SearchAccount } from '@/mocks/accounts';
import type { FeedReport } from '@/types/feed';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AccountDetail {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  status: string;
  owner_user_id: string | null;
  created_at: string;
  report_count?: number;
  align_count?: number;
  oppose_count?: number;
  shosha_score?: number;
}

export interface SocialLink {
  platform: string;
  url: string;
  is_verified: boolean;
}

// ── Real API ───────────────────────────────────────────────────────────────────

const real = {
  searchAccounts: async (q: string): Promise<ApiResponse<{ accounts: SearchAccount[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/search?q=${encodeURIComponent(q)}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getAccount: async (id: string): Promise<ApiResponse<{ account: AccountDetail }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getAccountSocialLinks: async (id: string): Promise<ApiResponse<{ links: SocialLink[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/${id}/social-links`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  listAccountReports: async (
    accountId: string,
    cursor?: string,
  ): Promise<ApiResponse<PaginatedResponse<FeedReport>>> => {
    try {
      const params = new URLSearchParams({ account_id: accountId, status: 'APPROVED', limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await apiClient.get(`/reports?${params}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  createAccount: async (payload: {
    platform: string;
    handle: string;
    display_name?: string;
    bio?: string;
  }): Promise<ApiResponse<{ account: AccountDetail }>> => {
    try {
      const response = await apiClient.post('/accounts', payload);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

// ── Exports ────────────────────────────────────────────────────────────────────

export const searchAccounts   = USE_MOCKS ? mock.searchAccounts   : real.searchAccounts;
export const getAccount       = USE_MOCKS ? mock.getAccount       : real.getAccount;
export const getAccountSocialLinks = USE_MOCKS ? mock.getAccountSocialLinks : real.getAccountSocialLinks;
export const listAccountReports    = USE_MOCKS ? mock.listAccountReports    : real.listAccountReports;
export const createAccount    = USE_MOCKS ? mock.createAccount    : real.createAccount;
