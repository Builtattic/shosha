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

export interface ModerationScoringPayload {
  category?: string;
  deed?: string;
  base_score?: number;
  repetition_pattern?: number;
  intent?: number;
  circumstances?: number;
  final_impact?: number;
}

export async function moderateReport(
  reportId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
  scoring?: ModerationScoringPayload,
): Promise<{ report: ReportOut }> {
  const { data } = await apiClient.post<{ report: ReportOut }>(`/reports/${reportId}/moderate`, {
    decision,
    note: note ?? '',
    ...scoring,
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

// Evidence
export async function listEvidenceProposals() {
  const { data } = await apiClient.get<{ evidence_proposals: Record<string, unknown>[] }>(
    '/admin/evidence',
  );
  return data.evidence_proposals;
}

export async function decideEvidenceProposal(
  proposalId: string,
  verdict: 'APPROVED' | 'REJECTED',
  note?: string,
  finalImpact?: number,
) {
  const { data } = await apiClient.post(`/admin/evidence/${proposalId}/decide`, {
    verdict,
    note: note ?? 'Shosha evidence review.',
    ...(finalImpact !== undefined ? { final_impact: finalImpact } : {}),
  });
  return data;
}

export async function scanAccountEvidence(accountId: string) {
  const { data } = await apiClient.post(`/admin/accounts/${accountId}/evidence/scan`);
  return data;
}

// Audits
export async function listAudits() {
  const { data } = await apiClient.get<{ audits: Record<string, unknown>[] }>('/admin/audits');
  return data.audits;
}

export async function runAudit(auditId: string) {
  const { data } = await apiClient.post(`/admin/audits/${auditId}/run`);
  return data;
}

export async function decideAudit(auditId: string, verdict: 'completed' | 'rejected', note?: string) {
  const { data } = await apiClient.post(`/admin/audits/${auditId}/decide`, {
    verdict,
    note: note ?? '',
  });
  return data;
}

// Abuse
export async function listAbuseFlaggedReports() {
  const { data } = await apiClient.get<{ reports: Record<string, unknown>[] }>('/admin/abuse');
  return data.reports;
}

export async function dismissAbuse(reportId: string) {
  const { data } = await apiClient.post(`/admin/abuse/${reportId}/dismiss`);
  return data;
}

// Users (admin)
export async function listAdminUsers() {
  const { data } = await apiClient.get<{ users: Record<string, unknown>[] }>('/admin/users');
  return data.users;
}

export async function updateAdminUser(
  userId: string,
  fields: {
    role?: string;
    is_active?: boolean;
    email?: string;
    username?: string;
    display_name?: string;
    photo_url?: string;
  },
) {
  const { data } = await apiClient.patch<{ user: Record<string, unknown> }>(
    `/admin/users/${userId}`,
    fields,
  );
  return data.user;
}

export async function deleteAdminUser(userId: string) {
  const { data } = await apiClient.delete(`/admin/users/${userId}`);
  return data;
}

// Accounts (admin)
export async function listAdminAccounts() {
  const { data } = await apiClient.get<{ accounts: Record<string, unknown>[] }>('/admin/accounts');
  return data.accounts;
}

export async function updateAdminAccount(
  accountId: string,
  fields: {
    display_name?: string;
    bio?: string;
    status?: string;
    score?: number;
    owner_user_id?: string | null;
  },
) {
  const { data } = await apiClient.patch<{ account: Record<string, unknown> }>(
    `/admin/accounts/${accountId}`,
    fields,
  );
  return data.account;
}

export async function deleteAdminAccount(accountId: string) {
  const { data } = await apiClient.delete(`/admin/accounts/${accountId}`);
  return data;
}

export async function createAdminAccount(payload: {
  platform: string;
  handle: string;
  display_name?: string;
  bio?: string;
}) {
  const { data } = await apiClient.post<{ account: Record<string, unknown> }>(
    '/admin/accounts',
    payload,
  );
  return data.account;
}

// Deletion requests
export async function listDeletionRequests() {
  const { data } = await apiClient.get<{ deletion_requests: Record<string, unknown>[] }>(
    '/admin/deletion-requests',
  );
  return data.deletion_requests;
}

export async function decideDeletionRequest(
  requestId: string,
  verdict: 'approved' | 'rejected',
  note?: string,
) {
  const { data } = await apiClient.post(`/admin/deletion-requests/${requestId}/decide`, {
    verdict,
    note: note ?? '',
  });
  return data;
}

// Trust badge
export async function listTrustBadgePending() {
  const { data } = await apiClient.get<{ items: Record<string, unknown>[] }>('/admin/trust-badge');
  return data.items;
}

export async function decideTrustBadge(
  userId: string,
  verdict: 'approved' | 'rejected',
  note?: string,
) {
  const { data } = await apiClient.post(`/admin/trust-badge/${userId}/decide`, {
    verdict,
    note: note ?? '',
  });
  return data;
}

// Issues
export async function listIssueReports() {
  const { data } = await apiClient.get<{ issues: Record<string, unknown>[] }>('/admin/issues');
  return data.issues;
}

export async function updateIssueStatus(
  issueId: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED',
) {
  const { data } = await apiClient.post(`/admin/issues/${issueId}/status`, { status });
  return data;
}

// Activity log
export async function listAdminActions() {
  const { data } = await apiClient.get<{ actions: Record<string, unknown>[] }>('/admin/actions');
  return data.actions;
}

// Settings
export async function getAdminSettings() {
  const { data } = await apiClient.get<{ settings: Record<string, unknown> }>('/admin/settings');
  return data.settings;
}

export async function updateAdminSettings(partial: Record<string, unknown>) {
  const { data } = await apiClient.patch<{ settings: Record<string, unknown> }>(
    '/admin/settings',
    partial,
  );
  return data.settings;
}

// Admin report create
export async function adminCreateReport(payload: {
  account_id: string;
  type: 'positive' | 'negative';
  description: string;
  feelings?: string;
  category: string;
  deed: string;
  base_score: number;
  note?: string;
  visibility?: 'public' | 'hidden';
  pinned?: boolean;
  featured?: boolean;
}) {
  const { data } = await apiClient.post('/admin/reports', payload);
  return data;
}

export async function assignOwnership(accountId: string, userId: string) {
  const { data } = await apiClient.post('/admin/ownership', {
    account_id: accountId,
    user_id: userId,
  });
  return data;
}

// Admin feed control
export async function getFeedReports(limit = 50, cursor?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const { data } = await apiClient.get<{
    items: ReportOut[];
    next_cursor: string | null;
  }>(`/feed?${params}`);
  return data;
}

export async function updateAdminReport(
  reportId: string,
  fields: {
    description?: string;
    visibility?: 'public' | 'hidden';
    pinned?: boolean;
    featured?: boolean;
    reported_at?: string;
  },
) {
  const { data } = await apiClient.patch<{ report: ReportOut }>(
    `/admin/reports/${reportId}`,
    fields,
  );
  return data.report;
}

export async function deleteAdminReport(reportId: string) {
  const { data } = await apiClient.delete(`/admin/reports/${reportId}`);
  return data;
}

// Data center
export async function getAdminDataCollections() {
  const { data } = await apiClient.get<{
    collections: Array<{ id: string; label: string; description: string }>;
    can_write: boolean;
  }>('/admin/data');
  return data;
}
