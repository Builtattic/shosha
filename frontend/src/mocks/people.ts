import type { ApiResponse } from '@/types/common';
import type { TrendingPerson, MeWithAccountsData } from '@/types/dashboard';
import type { UserProfile, UpdateUserPayload } from '@/types/user';

// ── Trending People ────────────────────────────────────────────────────────────

const MOCK_TRENDING: TrendingPerson[] = [
  {
    id: 'acc_t001',
    name: 'Leila Ahmadi',
    handle: 'leilaahmadi',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Leila',
    score: 1920,
    claimedBy: 'usr_t001',
    followUserId: 'usr_t001',
  },
  {
    id: 'acc_t002',
    name: 'James Okafor',
    handle: 'jamesokafor',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=James',
    score: 1680,
    claimedBy: null,
    followUserId: null,
  },
  {
    id: 'acc_t003',
    name: 'Sofia Reyes',
    handle: 'sofiareyes',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia',
    score: 1450,
    claimedBy: 'usr_t003',
    followUserId: 'usr_t003',
  },
  {
    id: 'acc_t004',
    name: 'Hiroshi Tanaka',
    handle: 'hiroshitanaka',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Hiroshi',
    score: 1310,
    claimedBy: null,
    followUserId: null,
  },
  {
    id: 'acc_t005',
    name: 'Amara Osei',
    handle: 'amaraosei',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Amara',
    score: 1180,
    claimedBy: 'usr_t005',
    followUserId: 'usr_t005',
  },
];

export async function getTrendingPeople(): Promise<ApiResponse<{ items: TrendingPerson[] }>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ok: true, data: { items: MOCK_TRENDING } };
}

// ── Dashboard /me with claimed accounts ───────────────────────────────────────

export async function getDashboardMe(): Promise<ApiResponse<MeWithAccountsData>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    ok: true,
    data: {
      user: {
        id: 'usr_mock123',
        username: 'mockuser',
        display_name: 'Mock User',
        photo_url: null,
        bio: null,
        role: 'USER',
      },
      claimedAccounts: [],
    },
  };
}

// ── Auth proxies (re-exported for backwards compat) ───────────────────────────

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
      display_name: payload.display_name ?? null,
      photo_url: payload.photo_url ?? null,
      onboarding_complete: false,
      created_at: new Date().toISOString(),
    },
  };
}
