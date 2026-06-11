import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/people';
import type { ApiResponse } from '@/types/common';
import type { TrendingPerson, MeWithAccountsData } from '@/types/dashboard';
import type { DeckResponse, SwipeResult, SwipeDirection } from '@/types/people';

const real = {
  getTrendingPeople: async (): Promise<ApiResponse<{ items: TrendingPerson[] }>> => {
    try {
      const response = await apiClient.get('/people/trending');
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getDashboardMe: async (): Promise<ApiResponse<MeWithAccountsData>> => {
    try {
      const meRes = await apiClient.get<{ user: MeWithAccountsData['user'] }>('/users/me');
      const user = meRes.data.user;

      const accountsRes = await apiClient.get<{ items: MeWithAccountsData['claimedAccounts'] }>(
        '/accounts/',
        { params: { limit: 10, owner_user_id: user.id } },
      );
      const claimedAccounts = accountsRes.data.items ?? [];

      return { ok: true, data: { user, claimedAccounts } };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  },
};

export const getTrendingPeople = USE_MOCKS ? mock.getTrendingPeople : real.getTrendingPeople;
export const getDashboardMe = USE_MOCKS ? mock.getDashboardMe : real.getDashboardMe;

export async function getPeopleDeck(
  cursor = 0,
  filters: {
    platform?: string;
    score_filter?: string;
    limit?: number;
  } = {},
): Promise<DeckResponse> {
  const params = new URLSearchParams();
  params.set('cursor', String(cursor));
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.score_filter) params.set('score_filter', filters.score_filter);
  if (filters.limit) params.set('limit', String(filters.limit));
  const res = await apiClient.get<DeckResponse>(`/people/deck?${params}`);
  return res.data;
}

export async function swipePerson(
  accountId: string,
  direction: SwipeDirection,
): Promise<SwipeResult> {
  const res = await apiClient.post<SwipeResult>(
    `/people/deck/${accountId}/swipe`,
    { direction },
  );
  return res.data;
}
