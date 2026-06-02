export type AccountType = 'individual' | 'business';
export type AccountStatus = 'active' | 'suspended' | 'pending';

export interface Account {
  id: string;
  slug: string;
  owner_user_id: string;
  type: AccountType;
  display_name: string;
  username: string;
  bio: string | null;
  photo_url: string | null;
  cover_url: string | null;
  reputation_score: number;
  trust_badge: boolean;
  status: AccountStatus;
  is_following?: boolean;
  follower_count: number;
  following_count: number;
  report_count: number;
  created_at: string;
}

export interface AccountSummary {
  id: string;
  slug: string;
  display_name: string;
  username: string;
  photo_url: string | null;
  reputation_score: number;
  trust_badge: boolean;
}
