import { USE_MOCKS } from '@/lib/apiClient';
import * as mock from '@/mocks/auth';
import { apiClient } from '@/lib/apiClient';
import type { UserProfile, UpdateUserPayload } from '@/types/user';
import type { ApiResponse } from '@/types/common';

const real = {
  getCurrentUser: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.get('/users/me');
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  updateCurrentUser: async (payload: UpdateUserPayload): Promise<ApiResponse<UserProfile>> => {
    try {
      const response = await apiClient.patch('/users/me', payload);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

export const getCurrentUser = USE_MOCKS ? mock.getCurrentUser : real.getCurrentUser;
export const updateCurrentUser = USE_MOCKS ? mock.updateCurrentUser : real.updateCurrentUser;
