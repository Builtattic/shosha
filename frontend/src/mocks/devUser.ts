import type { UserProfile } from '@/types/user';

/** Fake Firebase user stored in localStorage when using dev preview login. */
export const DEV_MOCK_FIREBASE_USER = {
  uid: 'fb_dev_preview',
  email: 'dev@shosha.local',
  displayName: 'Dev Preview',
} as const;

/** Full profile used for mock API when dev preview is active (or MOCK_SCENARIO is returning_user). */
export const DEV_DUMMY_PROFILE: UserProfile = {
  id: 'usr_dev_preview',
  firebase_uid: DEV_MOCK_FIREBASE_USER.uid,
  username: 'dev_preview',
  display_name: 'Dev Preview',
  name: 'Dev Preview',
  email: 'dev@shosha.local',
  phone: '+919876543210',
  photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devpreview',
  onboarding_complete: true,
  trust_badge: true,
  bio: 'Mock user for UI development — no backend required.',
  quote: 'Building trust, one screen at a time.',
  city: 'Mumbai',
  country: 'India',
  occupation_role: 'Product',
  network_size: '500+',
  education: 'B.Tech',
  specialized_field: 'Trust & Safety',
  created_at: '2024-01-15T00:00:00.000Z',
};

export const MOCK_PROFILE_PATCH_KEY = 'mock_profile_patch';

export function clearMockProfilePatch(): void {
  try {
    sessionStorage.removeItem(MOCK_PROFILE_PATCH_KEY);
  } catch {
    // ignore
  }
}
