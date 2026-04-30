import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import type { AppUser } from '@/lib/repos/users';

export type AdminEntityType = 'report' | 'account' | 'user' | 'claim' | 'audit' | 'ownership' | 'settings' | 'score' | 'dispute';

export type AdminActionRecord = {
  _id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  entityType: AdminEntityType;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

function ref() {
  return adminDb().ref('adminActions');
}

export async function create(input: {
  actor: AppUser;
  action: string;
  entityType: AdminEntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<AdminActionRecord> {
  const newRef = ref().push();
  const payload = {
    actorId: input.actor._id,
    actorUsername: input.actor.username,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    createdAt: new Date().toISOString(),
  };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function list(limit = 300): Promise<AdminActionRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: AdminActionRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AdminActionRecord>(child.key!, child.val()));
  });
  return results.reverse();
}
