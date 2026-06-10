export type ReportType = 'positive' | 'negative';
export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

export interface ReportMediaItem {
  id: string;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
}

export interface ReportOut {
  id: string;
  account_id: string;
  reporter_user_id: string | null;
  status: ReportStatus;
  title: string;
  description: string;
  deed: string | null;
  base_score: number | null;
  type: ReportType | null;
  is_irl: boolean;
  evidence_source_url: string | null;
  ai_verdict: Record<string, unknown> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  media_items: ReportMediaItem[];
  account: {
    id: string;
    platform: string;
    handle: string;
    display_name: string | null;
    score: number;
  } | null;
}

export interface ReportCreatePayload {
  account_id: string;
  title: string;
  description: string;
  type: ReportType;
  is_irl: boolean;
  evidence_source_url?: string;
  media?: Array<{
    media_type: 'image' | 'video';
    url: string;
    thumbnail_url?: string;
  }>;
}
