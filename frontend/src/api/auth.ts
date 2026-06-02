import { USE_MOCKS } from '@/lib/apiClient';
import * as mock from '@/mocks/auth';
// We'll stub the real API functions directly in this file for now 
// until apiReal folder structure is fully established.
import { apiClient } from '@/lib/apiClient';
import type { UserProfile, ApiResponse } from '@/types/user';

const real = {
  getCurrentUser: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.get('/users/me');
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const getCurrentUser = USE_MOCKS ? mock.getCurrentUser : real.getCurrentUser;
