import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/accounts';
import type { ApiResponse } from '@/types/common';
import type { SearchAccount } from '@/mocks/accounts'; // Share type for now

const real = {
  searchAccounts: async (q: string): Promise<ApiResponse<{ accounts: SearchAccount[] }>> => {
    try {
      const response = await apiClient.get(`/accounts/search?q=${encodeURIComponent(q)}&discover=0`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const searchAccounts = USE_MOCKS ? mock.searchAccounts : real.searchAccounts;
