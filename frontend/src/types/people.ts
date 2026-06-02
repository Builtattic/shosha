import type { AccountSummary } from './account';

export type SwipeDirection = 'follow' | 'skip';

export interface PersonCard extends AccountSummary {
  mutual_count: number;
  occupation_role: string | null;
  location: string | null;
  tags: string[];
}

export interface SwipePayload {
  account_id: string;
  direction: SwipeDirection;
}
