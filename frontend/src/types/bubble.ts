export type BubbleType =
  | 'FAMILY'
  | 'FRIEND_GROUP'
  | 'COLLEGE_GROUP'
  | 'WORK_GROUP'
  | 'COMPANY'
  | 'SPORTS_GROUP'
  | 'OTHER';

export type BubbleVisibility = 'PUBLIC' | 'PRIVATE';
export type BubbleMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type BubbleJoinStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Bubble {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  bubble_type: BubbleType;
  category: string | null;
  cover_image_url: string | null;
  image_url: string | null;
  created_by: string;
  is_admin_created: boolean;
  visibility: BubbleVisibility;
  created_at: string;
  member_count: number;
}

export interface BubbleMember {
  id: string;
  bubble_id: string;
  user_id: string;
  role: BubbleMemberRole;
  score: number;
  joined_at: string;
}

export interface BubbleDetail extends Bubble {
  members: BubbleMember[];
}

export interface JoinRequest {
  id: string;
  bubble_id: string;
  user_id: string;
  status: BubbleJoinStatus;
  approvals: string[];
  rejections: string[];
  created_at: string;
}

export interface BubbleCreatePayload {
  name: string;
  tagline?: string;
  description: string;
  bubble_type: BubbleType;
  category?: string;
  cover_image_url?: string;
  image_url?: string;
  visibility: BubbleVisibility;
  invited_usernames?: string[];
}
