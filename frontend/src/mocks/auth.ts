import type { UserProfile, UpdateUserPayload } from '@/types/user';
import type { ApiResponse } from '@/types/common';

export const MOCK_SCENARIO: 'new_user' | 'returning_user' = 'new_user';

// ── Persisted mock profile state ───────────────────────────────────────────────
// We use sessionStorage so that updateCurrentUser's changes survive the
// navigate() call and are visible to the next getCurrentUser() invocation
// (which runs inside TanStack Query when refetchProfile() invalidates the cache).

const STORAGE_KEY = 'mock_profile_patch';

function readPatch(): Partial<UserProfile> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePatch(patch: Partial<UserProfile>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(patch));
  } catch {
    // ignore
  }
}

const BASE_NEW_USER: UserProfile = {
  id: 'usr_mock123',
  firebase_uid: 'fb_mock123',
  username: null,
  display_name: null,
  photo_url: null,
  onboarding_complete: false,
  created_at: new Date().toISOString(),
};

const BASE_RETURNING_USER: UserProfile = {
  id: 'usr_mock456',
  firebase_uid: 'fb_mock456',
  username: 'shosha_admin',
  display_name: 'Shosha Admin',
  photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shosha',
  onboarding_complete: true,
  created_at: new Date().toISOString(),
};

export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const base = MOCK_SCENARIO === 'new_user' ? BASE_NEW_USER : BASE_RETURNING_USER;
  const patch = readPatch();

  return {
    ok: true,
    data: { ...base, ...patch },
  };
}

export async function updateCurrentUser(payload: UpdateUserPayload): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 600));

  const base = MOCK_SCENARIO === 'new_user' ? BASE_NEW_USER : BASE_RETURNING_USER;

  // Build the updated profile and persist it so getCurrentUser() sees it next time
  const updated: UserProfile = {
    ...base,
    ...readPatch(),
    username: payload.username ?? base.username,
    display_name: payload.name ?? base.display_name,
    photo_url: payload.photo_url ?? base.photo_url,
    onboarding_complete: payload.onboarding_complete ?? base.onboarding_complete,
  };

  writePatch({
    username: updated.username,
    display_name: updated.display_name,
    photo_url: updated.photo_url,
    onboarding_complete: updated.onboarding_complete,
  });

  return { ok: true, data: updated };
}
