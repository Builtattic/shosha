import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/people';
import type { ApiResponse } from '@/types/common';
import type { TrendingPerson, MeWithAccountsData } from '@/types/dashboard';

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
      const response = await apiClient.get('/users/me/dashboard');
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const getTrendingPeople = USE_MOCKS ? mock.getTrendingPeople : real.getTrendingPeople;
export const getDashboardMe = USE_MOCKS ? mock.getDashboardMe : real.getDashboardMe;
