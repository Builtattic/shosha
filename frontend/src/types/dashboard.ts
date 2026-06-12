import type { Account } from '@/types/account';

/** User slice returned by GET /users/me (UserPrivate, snake_case). */
export interface DashboardMeUser {
  id: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  bio?: string | null;
  role?: string;
  // Basic info
  phone?: string | null;
  dob?: string | null;
  city?: string | null;
  country?: string | null;
  quote?: string | null;
  // Onboarding questions
  occupation_role?: string | null;
  network_size?: string | null;
  education?: string | null;
  specialized_field?: string | null;
  manages_money_people_system?: string | null;
  physical_intellectual_limitations?: string | null;
  // Social links
  ig_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  reddit_url?: string | null;
  yt_url?: string | null;
  fb_url?: string | null;
  snapchat_url?: string | null;
  // Verification
  trust_badge?: boolean | null;
}

export interface TrendingPerson {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  claimedBy?: string | null;
  followUserId?: string | null;
}

export interface MeWithAccountsData {
  user: DashboardMeUser;
  claimedAccounts: Account[];
}
