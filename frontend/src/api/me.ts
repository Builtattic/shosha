import { apiClient } from '@/lib/apiClient';

export interface MeFiling {
  id: string;
  title: string | null;
  category: string | null;
  delta: number;
  type: string;
  status: string;
  created_at: string;
}

export interface ScoreReplayResult {
  account_results: Array<{
    account_id: string;
    final_score: number;
    platform: string;
    handle: string;
    global_rank: number;
  }>;
  user_results: never[];
}

export async function getMyFilings(): Promise<{ filings: MeFiling[] }> {
  const res = await apiClient.get('/me/filings');
  return res.data;
}

export async function replayMyScore(): Promise<ScoreReplayResult> {
  const res = await apiClient.post('/me/score/replay');
  return res.data;
}

export async function getMyBookmarks() {
  const res = await apiClient.get('/me/bookmarks');
  return res.data;
}

export async function submitDeletionRequest(reason: string, details?: string) {
  const res = await apiClient.post('/me/deletion-request', { reason, details });
  return res.data;
}
