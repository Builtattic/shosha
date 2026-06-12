export type SwipeDirection = 'ALIGN' | 'OPPOSE';

export interface DeckItem {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  score: number;
  owner_user_id: string | null;
  status: string;
  week_delta?: number | null;
}

export interface DeckResponse {
  items: DeckItem[];
  next_cursor: number;
  has_more: boolean;
}

export interface SwipeResult {
  account_id: string;
  direction: SwipeDirection;
  delta: number;
  new_account_score: number;
}
