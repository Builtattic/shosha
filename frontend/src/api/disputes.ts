import { apiClient } from '@/lib/apiClient';

export interface Dispute {
  id: string;
  report_id: string;
  account_id: string;
  requester_user_id: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  reason: string;
  evidence_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DisputeCreatePayload {
  report_id: string;
  account_id: string;
  reason: string;
  evidence_url?: string;
}

export async function listMyDisputes(limit = 50): Promise<Dispute[]> {
  const res = await apiClient.get<{ items: Dispute[]; next_cursor: string | null }>(
    `/disputes/mine?limit=${limit}`,
  );
  return res.data.items;
}

export async function createDispute(payload: DisputeCreatePayload): Promise<Dispute> {
  const res = await apiClient.post<{ dispute: Dispute }>('/disputes/', payload);
  return res.data.dispute;
}

export async function withdrawDispute(disputeId: string): Promise<Dispute> {
  const res = await apiClient.post<{ dispute: Dispute }>(`/disputes/${disputeId}/withdraw`);
  return res.data.dispute;
}
