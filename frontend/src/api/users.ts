import { USE_MOCKS, apiClient } from '@/lib/apiClient';
import * as mock from '@/mocks/auth';
import type { ApiResponse } from '@/types/common';
import type { UserProfile, UpdateUserPayload } from '@/types/user';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  role: string;
  created_at: string;
}

// ── Real API ───────────────────────────────────────────────────────────────────

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

  checkUsernameAvailability: async (username: string): Promise<ApiResponse<{ username: string; available: boolean }>> => {
    try {
      const response = await apiClient.get(`/users/username-availability?username=${encodeURIComponent(username)}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  getPublicUser: async (userId: string): Promise<ApiResponse<{ user: PublicUser }>> => {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return { ok: true, data: response.data };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
};

// ── Mock shims ─────────────────────────────────────────────────────────────────

async function mockCheckUsernameAvailability(
  username: string,
): Promise<ApiResponse<{ username: string; available: boolean }>> {
  await new Promise((r) => setTimeout(r, 400));
  const taken = ['admin', 'shosha', 'moderator', 'tejas'];
  return { ok: true, data: { username, available: !taken.includes(username.toLowerCase()) } };
}

async function mockGetPublicUser(userId: string): Promise<ApiResponse<{ user: PublicUser }>> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    ok: true,
    data: {
      user: {
        id: userId,
        username: 'mock_user',
        display_name: 'Mock User',
        photo_url: null,
        role: 'USER',
        created_at: new Date().toISOString(),
      },
    },
  };
}

// ── Exports ────────────────────────────────────────────────────────────────────

export const getCurrentUser           = USE_MOCKS ? mock.getCurrentUser           : real.getCurrentUser;
export const updateCurrentUser        = USE_MOCKS ? mock.updateCurrentUser        : real.updateCurrentUser;
export const checkUsernameAvailability = USE_MOCKS ? mockCheckUsernameAvailability : real.checkUsernameAvailability;
export const getPublicUser            = USE_MOCKS ? mockGetPublicUser             : real.getPublicUser;
