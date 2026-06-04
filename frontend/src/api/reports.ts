import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/reports';
import type { ApiResponse } from '@/types/common';
import type { FeedReport } from '@/types/feed';

const real = {
  getReport: async (id: string): Promise<ApiResponse<FeedReport>> => {
    try {
      const response = await apiClient.get(`/reports/${id}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const getReport = USE_MOCKS ? mock.getReport : real.getReport;
