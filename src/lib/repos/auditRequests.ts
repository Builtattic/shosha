import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';

export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export type AuditRequestRecord = {
  _id: string;
  userId: string;
  accountId: string;
  reason: string;
  status: AuditStatus;
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('auditRequests');
}

export async function findById(id: string): Promise<AuditRequestRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<AuditRequestRecord>(snap.key!, snap.val());
}

export async function create(input: Omit<AuditRequestRecord, '_id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<AuditRequestRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = { ...input, status: 'pending' as AuditStatus, createdAt: now, updatedAt: now };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function update(id: string, partial: Partial<AuditRequestRecord>): Promise<AuditRequestRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}

export async function listPending(): Promise<AuditRequestRecord[]> {
  const snap = await ref().orderByChild('createdAt').once('value');
  const results: AuditRequestRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (val.status === 'pending' || val.status === 'in_progress') {
      results.push(withId<AuditRequestRecord>(child.key!, val));
    }
  });
  return results;
}
