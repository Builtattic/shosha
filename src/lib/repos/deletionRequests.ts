import { adminDb } from '@/lib/firebase/admin';
import { stripUndefined, withId } from '@/lib/repos/_serialize';

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type DeletionRequestUserSnapshot = {
  username: string;
  email: string;
  name?: string;
};

export type DeletionRequestRecord = {
  _id: string;
  userId: string;
  userSnapshot?: DeletionRequestUserSnapshot;
  reason: string;
  details?: string;
  attachmentUrls?: string[];
  status: DeletionRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
};

function ref() {
  return adminDb().ref('deletionRequests');
}

type CreateDeletionRequestInput = Omit<DeletionRequestRecord, '_id' | 'createdAt' | 'updatedAt'>;

export async function create(
  input: CreateDeletionRequestInput
): Promise<DeletionRequestRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = stripUndefined({
    ...input,
    status: input.status ?? ('pending' as const),
    attachmentUrls: input.attachmentUrls ?? [],
    createdAt: now,
    updatedAt: now,
  });
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload } as DeletionRequestRecord;
}

export async function findById(id: string): Promise<DeletionRequestRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<DeletionRequestRecord>(snap.key!, snap.val());
}

export async function findByUser(userId: string): Promise<DeletionRequestRecord[]> {
  const snap = await ref().orderByChild('userId').equalTo(userId).limitToLast(5).once('value');
  const results: DeletionRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<DeletionRequestRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function update(
  id: string,
  partial: Partial<DeletionRequestRecord>
): Promise<DeletionRequestRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(stripUndefined(patch));
  return (await findById(id))!;
}

export async function listPending(): Promise<DeletionRequestRecord[]> {
  const snap = await ref().orderByChild('status').equalTo('pending').once('value');
  const results: DeletionRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<DeletionRequestRecord>(child.key!, child.val()));
  });
  return results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listAll(limit = 100): Promise<DeletionRequestRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: DeletionRequestRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<DeletionRequestRecord>(child.key!, child.val()));
  });
  return results.reverse();
}
