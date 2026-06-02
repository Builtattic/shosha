import type { UserProfile, UpdateUserPayload } from '@/types/user';
import type { ApiResponse } from '@/types/common';

export const MOCK_SCENARIO: 'new_user' | 'returning_user' = 'new_user';

export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (MOCK_SCENARIO === 'new_user') {
    return {
      ok: true,
      data: {
        id: 'usr_mock123',
        firebase_uid: 'fb_mock123',
        username: null,
        display_name: null,
        photo_url: null,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      },
    };
  }

  return {
    ok: true,
    data: {
      id: 'usr_mock456',
      firebase_uid: 'fb_mock456',
      username: 'shosha_admin',
      display_name: 'Shosha Admin',
      photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shosha',
      onboarding_complete: true,
      created_at: new Date().toISOString(),
    },
  };
}

export async function updateCurrentUser(payload: UpdateUserPayload): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 600));
  return {
    ok: true,
    data: {
      id: 'usr_mock123',
      firebase_uid: 'fb_mock123',
      username: payload.username ?? null,
      display_name: payload.name ?? null,
      photo_url: payload.photo_url ?? null,
      onboarding_complete: payload.onboarding_complete ?? false,
      created_at: new Date().toISOString(),
    },
  };
}
