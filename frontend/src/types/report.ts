export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type VoteDirection = 'up' | 'down';

export interface Report {
  id: string;
  account_id: string;
  reporter_id: string;
  title: string;
  description: string;
  evidence_urls: string[];
  status: ReportStatus;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  my_vote?: VoteDirection | null;
  created_at: string;
  updated_at: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  author_id: string;
  author_display_name: string;
  author_photo_url: string | null;
  body: string;
  created_at: string;
}

export interface CreateReportPayload {
  account_id: string;
  title: string;
  description: string;
  evidence_urls?: string[];
}
