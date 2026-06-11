import type { Account } from '@/types/account';

/** User slice returned by GET /users/me (UserPrivate, snake_case). */
export interface DashboardMeUser {
  id: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  bio?: string | null;
  role?: string;
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
