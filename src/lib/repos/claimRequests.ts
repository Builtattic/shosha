import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type ClaimProofType = 'bio_code' | 'dm_screenshot' | 'oauth';

export type ClaimRequestRecord = {
  _id: string;
  userId: string;
  accountId: string;
  proofType: ClaimProofType;
  proofPayload: Record<string, unknown>;
  status: ClaimStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('claimRequests');
}

export async function findById(id: string): Promise<ClaimRequestRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<ClaimRequestRecord>(snap.key!, snap.val());
}

export async function create(input: Omit<ClaimRequestRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ClaimRequestRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = { ...input, createdAt: now, updatedAt: now };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function update(id: string, partial: Partial<ClaimRequestRecord>): Promise<ClaimRequestRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}

export async function listPending(): Promise<ClaimRequestRecord[]> {
  const snap = await ref().orderByChild('status').equalTo('pending').once('value');
  const results: ClaimRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<ClaimRequestRecord>(child.key!, child.val()));
  });
  return results;
}
