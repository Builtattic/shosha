import type { UserProfile, UpdateUserPayload } from '@/types/user';
import type { ApiResponse } from '@/types/common';
import {
  DEV_DUMMY_PROFILE,
  MOCK_PROFILE_PATCH_KEY,
  clearMockProfilePatch,
} from '@/mocks/devUser';

/** Use `returning_user` or dev preview to browse the app without onboarding. */
export const MOCK_SCENARIO: 'new_user' | 'returning_user' = 'returning_user';

// ── Persisted mock profile state ───────────────────────────────────────────────
// We use sessionStorage so that updateCurrentUser's changes survive the
// navigate() call and are visible to the next getCurrentUser() invocation
// (which runs inside TanStack Query when refetchProfile() invalidates the cache).

const STORAGE_KEY = MOCK_PROFILE_PATCH_KEY;

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

const BASE_RETURNING_USER: UserProfile = DEV_DUMMY_PROFILE;

function getBaseProfile(): UserProfile {
  return MOCK_SCENARIO === 'new_user' ? BASE_NEW_USER : BASE_RETURNING_USER;
}

export async function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const base = getBaseProfile();
  const patch = readPatch();

  return {
    ok: true,
    data: { ...base, ...patch },
  };
}

export { clearMockProfilePatch };

/** Mock-only: mark onboarding complete (no backend field in Day 12). */
export function setMockOnboardingComplete(complete: boolean) {
  writePatch({ ...readPatch(), onboarding_complete: complete });
}

export async function updateCurrentUser(payload: UpdateUserPayload): Promise<ApiResponse<UserProfile>> {
  await new Promise(resolve => setTimeout(resolve, 600));

  const base = getBaseProfile();

  // Build the updated profile and persist it so getCurrentUser() sees it next time
  const updated: UserProfile = {
    ...base,
    ...readPatch(),
    username: payload.username ?? base.username,
    display_name: payload.display_name ?? base.display_name,
    photo_url: payload.photo_url ?? base.photo_url,
    bio: payload.bio ?? base.bio,
    headline: payload.headline ?? base.headline,
    city: payload.city ?? base.city,
    website_url: payload.website_url ?? base.website_url,
    onboarding_complete:
      payload.onboarding_complete ?? readPatch().onboarding_complete ?? base.onboarding_complete,
  };

  writePatch({
    username: updated.username,
    display_name: updated.display_name,
    photo_url: updated.photo_url,
    bio: updated.bio,
    headline: updated.headline,
    city: updated.city,
    website_url: updated.website_url,
    onboarding_complete: updated.onboarding_complete,
  });

  return { ok: true, data: updated };
}
