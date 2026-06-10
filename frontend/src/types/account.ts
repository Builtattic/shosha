export type AccountStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'DISPUTED' | 'REMOVED';

export interface SocialLink {
  platform: string;
  url: string;
  is_verified: boolean;
}

export interface Account {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  status: AccountStatus;
  owner_user_id: string | null;
  created_at: string;
  score: number;
  score_breakdown: Record<string, unknown> | null;
  social_links: SocialLink[];
}

export interface AccountCreatePayload {
  platform: string;
  handle: string;
  display_name?: string;
  bio?: string;
}

export interface AccountUpdatePayload {
  display_name?: string;
  bio?: string;
}
