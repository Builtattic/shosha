import { USE_MOCKS } from '@/lib/apiClient';
import * as mock from '@/mocks/auth';
import { apiClient } from '@/lib/apiClient';
import type { UserProfile, UpdateUserPayload } from '@/types/user';
import type { ApiResponse } from '@/types/common';

function formatApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

const real = {
  getCurrentUser: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      const { data } = await apiClient.get<{ user: UserProfile }>('/users/me');
      return { ok: true, data: data.user };
    } catch (error: unknown) {
      return { ok: false, error: formatApiError(error) };
    }
  },

  updateCurrentUser: async (payload: UpdateUserPayload): Promise<ApiResponse<UserProfile>> => {
    try {
      const { data } = await apiClient.patch<{ user: UserProfile }>('/users/me', payload);
      return { ok: true, data: data.user };
    } catch (error: unknown) {
      return { ok: false, error: formatApiError(error) };
    }
  },
};

export const getCurrentUser = USE_MOCKS ? mock.getCurrentUser : real.getCurrentUser;
export const updateCurrentUser = USE_MOCKS ? mock.updateCurrentUser : real.updateCurrentUser;
