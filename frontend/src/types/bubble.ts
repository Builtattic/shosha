export type BubbleVisibility = 'public' | 'private' | 'invite_only';
export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export interface Bubble {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  visibility: BubbleVisibility;
  member_count: number;
  is_member?: boolean;
  membership_status?: MembershipStatus | null;
  created_by: string;
  created_at: string;
}

export interface BubbleMember {
  account_id: string;
  display_name: string;
  photo_url: string | null;
  reputation_score: number;
  joined_at: string;
}
