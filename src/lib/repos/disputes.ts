import { adminDb } from '@/lib/firebase/admin';

export type DisputeStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';

export type DisputeType = 'factual_inaccuracy' | 'outdated_information' | 'missing_context' | 'mistaken_identity' | 'evidence_fabricated';

export type DisputeRecord = {
  _id: string;
  userId: string;
  accountId: string;
  reportId: string;
  disputeType?: DisputeType;
  reason: string;
  evidenceUrl?: string;
  status: DisputeStatus;
  resolution?: {
    adminId: string;
    verdict: 'accepted' | 'rejected';
    note: string;
    decidedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

function ref() {
  return adminDb().ref('disputes');
}

export async function create(input: {
  userId: string;
  accountId: string;
  reportId: string;
  disputeType?: DisputeType;
  reason: string;
  evidenceUrl?: string;
}): Promise<DisputeRecord> {
  const now = new Date().toISOString();
  const payload: Omit<DisputeRecord, '_id'> = {
    userId: input.userId,
    accountId: input.accountId,
    reportId: input.reportId,
    disputeType: input.disputeType,
    reason: input.reason,
    evidenceUrl: input.evidenceUrl ?? '',
    status: 'pending',
    resolution: null,
    createdAt: now,
    updatedAt: now
  };
  const pushRef = await ref().push(payload);
  return { _id: pushRef.key!, ...payload };
}

export async function findById(id: string): Promise<DisputeRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  const value = snap.val() ?? {};
  return { _id: snap.key!, ...value } as DisputeRecord;
}

export async function listForUser(userId: string, limit = 50): Promise<DisputeRecord[]> {
  const snap = await ref().orderByChild('userId').equalTo(userId).limitToLast(limit).once('value');
  if (!snap.exists()) return [];
  const out: DisputeRecord[] = [];
  snap.forEach((child) => {
    out.push({ _id: child.key!, ...(child.val() ?? {}) } as DisputeRecord);
  });
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listByStatus(statuses: DisputeStatus[], limit = 200): Promise<DisputeRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  if (!snap.exists()) return [];
  const out: DisputeRecord[] = [];
  snap.forEach((child) => {
    const value = child.val() ?? {};
    if (statuses.includes(value.status)) {
      out.push({ _id: child.key!, ...value } as DisputeRecord);
    }
  });
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function update(id: string, patch: Partial<Omit<DisputeRecord, '_id'>>): Promise<DisputeRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const next = { ...patch, updatedAt: new Date().toISOString() };
  await ref().child(id).update(next as Record<string, unknown>);
  return findById(id);
}

export async function withdraw(id: string): Promise<DisputeRecord | null> {
  return update(id, { status: 'withdrawn' });
}

export async function decide(
  id: string,
  resolution: { adminId: string; verdict: 'accepted' | 'rejected'; note: string }
): Promise<DisputeRecord | null> {
  return update(id, {
    status: resolution.verdict,
    resolution: { ...resolution, decidedAt: new Date().toISOString() }
  });
}
