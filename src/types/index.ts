export type Platform = 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'website';
export type ScoreCause = 'seed' | 'report' | 'audit' | 'decay';
export type ReportType = 'positive' | 'negative';
export type ReportStatus = 'pending_ai' | 'ai_reviewed' | 'approved' | 'rejected' | 'flagged';
export type ReportVisibility = 'public' | 'hidden';
export type ReportSource = 'user' | 'admin' | 'system';

export type Breakdown = {
  authenticity: number;
  engagement: number;
  community: number;
  content: number;
  impact: number;
};

export type ScoreHistoryPoint = {
  t: string | Date;
  s: number;
  cause: ScoreCause;
};

export type ApiOk<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiOk<T> | ApiError;
