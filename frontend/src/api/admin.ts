import { apiClient } from '@/lib/apiClient';
import type { ReportOut } from '@/types/report';

export interface ClaimOut {
  id: string;
  account_id: string;
  requester_user_id: string;
  status: string;
  evidence_type: string | null;
  evidence_payload: Record<string, unknown> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DisputeOut {
  id: string;
  report_id: string;
  account_id: string;
  requester_user_id: string;
  status: string;
  reason: string;
  evidence_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminStats {
  users: { total: number; active: number };
  accounts: { total: number; by_status: Record<string, number> };
  reports: { total: number; by_status: Record<string, number>; pending_count: number };
  claims: { pending: number };
  disputes: { pending: number };
}

export interface ModerationRequestItem {
  id: string;
  report_id: string;
  account_id: string;
  requested_by: string;
  reason: string;
  evidence_links: string[];
  status: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  report?: Record<string, unknown> | null;
  account?: {
    id: string;
    display_name: string;
    handle: string;
    platform: string;
  } | null;
  requester?: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats');
  return data;
}

export async function getModerationQueue(limit = 100): Promise<ReportOut[]> {
  const { data } = await apiClient.get<{ items: ReportOut[]; next_cursor: string | null }>(
    `/reports/moderation-queue?limit=${limit}`,
  );
  return data.items;
}

export async function moderateReport(
  reportId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<{ report: ReportOut }> {
  const { data } = await apiClient.post<{ report: ReportOut }>(`/reports/${reportId}/moderate`, {
    decision,
    note: note ?? '',
  });
  return data;
}

export async function listModerationRequests(limit = 200): Promise<ModerationRequestItem[]> {
  const { data } = await apiClient.get<{ moderation_requests: ModerationRequestItem[] }>(
    `/admin/moderation?limit=${limit}`,
  );
  return data.moderation_requests;
}

export async function decideModerationRequest(
  requestId: string,
  verdict: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<unknown> {
  const { data } = await apiClient.post(`/admin/moderation/${requestId}/decide`, {
    verdict,
    note: note ?? '',
  });
  return data;
}

export async function listPendingClaims(limit = 100): Promise<ClaimOut[]> {
  const { data } = await apiClient.get<{ items: ClaimOut[]; next_cursor: string | null }>(
    `/claims/pending?limit=${limit}`,
  );
  return data.items;
}

export async function decideClaim(
  claimId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
): Promise<{ claim: ClaimOut }> {
  const { data } = await apiClient.post<{ claim: ClaimOut }>(`/claims/${claimId}/decide`, {
    decision,
    note: note ?? null,
  });
  return data;
}

export async function listPendingDisputes(limit = 100): Promise<DisputeOut[]> {
  const { data } = await apiClient.get<{ items: DisputeOut[]; next_cursor: string | null }>(
    `/disputes/pending?limit=${limit}`,
  );
  return data.items;
}

export async function decideDispute(
  disputeId: string,
  decision: 'ACCEPTED' | 'REJECTED',
  note?: string,
): Promise<{ dispute: DisputeOut }> {
  const { data } = await apiClient.post<{ dispute: DisputeOut }>(`/disputes/${disputeId}/decide`, {
    decision,
    note: note ?? null,
  });
  return data;
}

export async function getReportForReview(reportId: string): Promise<ReportOut> {
  const { data } = await apiClient.get<{ report: ReportOut }>(`/reports/${reportId}`);
  return data.report;
}
