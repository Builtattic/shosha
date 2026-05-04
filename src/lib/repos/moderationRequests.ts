import { adminDb } from '@/lib/firebase/admin';
import { stripUndefined, withId } from '@/lib/repos/_serialize';

export type ModerationRequestStatus = 'pending' | 'approved' | 'rejected';

export type ModerationRequestRecord = {
  _id: string;
  reportId: string;
  accountId: string;
  requestedBy: string;
  reason: string;
  evidenceLinks: string[];
  status: ModerationRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
};

function ref() {
  return adminDb().ref('moderationRequests');
}

export async function create(
  input: Omit<ModerationRequestRecord, '_id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<ModerationRequestRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = stripUndefined({
    ...input,
    status: 'pending' as const,
    evidenceLinks: input.evidenceLinks ?? [],
    createdAt: now,
    updatedAt: now,
  });
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload } as ModerationRequestRecord;
}

export async function findById(id: string): Promise<ModerationRequestRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<ModerationRequestRecord>(snap.key!, snap.val());
}

export async function update(
  id: string,
  partial: Partial<ModerationRequestRecord>
): Promise<ModerationRequestRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(stripUndefined(patch));
  return (await findById(id))!;
}

export async function listAll(limit = 200): Promise<ModerationRequestRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: ModerationRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<ModerationRequestRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listByReport(reportId: string, limit = 50): Promise<ModerationRequestRecord[]> {
  const snap = await ref().orderByChild('reportId').equalTo(reportId).limitToLast(limit).once('value');
  const results: ModerationRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<ModerationRequestRecord>(child.key!, child.val()));
  });
  return results.reverse();
}
