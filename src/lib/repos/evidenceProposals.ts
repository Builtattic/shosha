import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import type { ReportType } from '@/types';

export type EvidenceProposalStatus = 'pending' | 'approved' | 'rejected';

export type EvidenceProposalRecord = {
  _id: string;
  accountId: string;
  profileId?: string;
  title: string;
  summary: string;
  type: ReportType;
  scoringDeed: string;
  scoringCategory?: string;
  baseScore?: number;
  suggestedImpact: number;
  confidence: number;
  sourceUrls: string[];
  sourceTitles?: string[];
  eventDate?: string;
  status: EvidenceProposalStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reportId?: string;
  eventId?: string;
  reporterId?: string | null;
  anonymousTag?: string;
  publicAnonymous?: boolean;
  createdByAdminId?: string;
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('evidenceProposals');
}

export async function create(input: Omit<EvidenceProposalRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<EvidenceProposalRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = { ...input, createdAt: now, updatedAt: now };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function findById(id: string): Promise<EvidenceProposalRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<EvidenceProposalRecord>(snap.key!, snap.val());
}

export async function update(id: string, partial: Partial<EvidenceProposalRecord>): Promise<EvidenceProposalRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}

export async function listPending(limit = 100): Promise<EvidenceProposalRecord[]> {
  const snap = await ref().orderByChild('status').equalTo('pending').limitToLast(limit).once('value');
  const results: EvidenceProposalRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<EvidenceProposalRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listForAccount(accountId: string, limit = 50): Promise<EvidenceProposalRecord[]> {
  const snap = await ref().orderByChild('accountId').equalTo(accountId).limitToLast(limit).once('value');
  const results: EvidenceProposalRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<EvidenceProposalRecord>(child.key!, child.val()));
  });
  return results.reverse();
}
