import { apiClient } from '@/lib/apiClient';

export interface ClaimOut {
  id: string;
  account_id: string;
  requester_user_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  evidence_type: string | null;
  evidence_payload: Record<string, unknown> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ClaimCreatePayload {
  account_id: string;
  evidence_type?: string | null;
  evidence_payload?: Record<string, unknown> | null;
}

export async function createClaim(payload: ClaimCreatePayload): Promise<ClaimOut> {
  const { data } = await apiClient.post<{ claim: ClaimOut }>('/claims/', payload);
  return data.claim;
}

export async function listMyClaims(limit = 50): Promise<ClaimOut[]> {
  const { data } = await apiClient.get<{ items: ClaimOut[]; next_cursor: string | null }>(
    `/claims/mine?limit=${limit}`,
  );
  return data.items;
}

export async function getClaim(claimId: string): Promise<ClaimOut> {
  const { data } = await apiClient.get<{ claim: ClaimOut }>(`/claims/${claimId}`);
  return data.claim;
}
