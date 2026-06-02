import type { UserProfile, ApiResponse } from '@/types/user';

export const MOCK_SCENARIO: 'new_user' | 'returning_user' = 'new_user';

export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  // We simulate a network delay.
  // The UI requires a 1600ms sequence to play out. If the network resolves faster,
  // the UI component itself handles waiting, but we'll add a realistic mock delay anyway.
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
  } else {
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
}
