import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/feed';
import type { ApiResponse } from '@/types/common';
import type { FeedReport, FeedFilter } from '@/types/feed';

const real = {
  getFeed: async (filter: FeedFilter): Promise<ApiResponse<FeedReport[]>> => {
    try {
      const response = await apiClient.get(`/feed?filter=${filter}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const getFeed = USE_MOCKS ? mock.getFeed : real.getFeed;
