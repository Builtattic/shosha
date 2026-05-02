import { adminDb } from '@/lib/firebase/admin';
import { withId, stripUndefined } from '@/lib/repos/_serialize';

export type MultiplierSnapshot = {
  identity: number;
  power: number;
  means: number;
  environment: number;
  awareness: number;
  ability: number;
  circumstances: number;
  responsibility: number;
  intent: number;
  reputation: number;
};

export type EventRecord = {
  _id: string;
  subjectId: string;
  reporterId: string | null;
  anonymousTag: string;
  eventType: 'positive' | 'negative';
  description: string;
  baseImpactKey: string;
  baseImpact: number;
  multipliers: MultiplierSnapshot;
  multiplierQuotient?: number;
  delta: number;
  scoreBefore?: number;
  scoreAfter?: number;
  decay?: number;
  category?: string;
  deed?: string;
  weekId?: string;
  formulaVersion?: string;
  proofLinks: string[];
  location: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  aiVerdict: { valid: boolean; reasoning: string } | null;
  adminDecision: { verdict: 'approved' | 'rejected'; note: string; decidedAt: string } | null;
  stats: { aligns: number; opposes: number; comments: number; shares: number };
  createdAt?: string;
};

function ref() {
  return adminDb().ref('events');
}

export async function create(input: Omit<EventRecord, '_id' | 'createdAt'>): Promise<EventRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = { ...input, createdAt: now };
  await newRef.set(stripUndefined(payload));
  return { _id: newRef.key!, ...payload };
}

export async function findById(id: string): Promise<EventRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<EventRecord>(snap.key!, snap.val());
}

export async function update(id: string, partial: Partial<EventRecord>): Promise<EventRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const { _id, ...clean } = partial as Record<string, unknown>;
  await ref().child(id).update(stripUndefined(clean));
  return (await findById(id))!;
}

export async function listForAccount(accountId: string, limit = 50): Promise<EventRecord[]> {
  const snap = await ref().orderByChild('subjectId').equalTo(accountId).limitToLast(limit).once('value');
  const results: EventRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<EventRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listByReporter(reporterId: string, limit = 50): Promise<EventRecord[]> {
  const snap = await ref().orderByChild('reporterId').equalTo(reporterId).limitToLast(limit).once('value');
  const results: EventRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<EventRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listPublicFeed(limit = 50): Promise<EventRecord[]> {
  // RTDB can't do `where status in [approved, pending]` — fetch recent and filter client-side
  const snap = await ref().orderByChild('timestamp').limitToLast(limit * 2).once('value');
  const results: EventRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (val.status === 'approved' || val.status === 'pending') {
      results.push(withId<EventRecord>(child.key!, val));
    }
  });
  return results.reverse().slice(0, limit);
}

export async function listPendingQueue(limit = 100): Promise<EventRecord[]> {
  const snap = await ref().orderByChild('status').equalTo('pending').limitToLast(limit).once('value');
  const results: EventRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<EventRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function findDuplicate(subjectId: string, description: string): Promise<EventRecord | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const snap = await ref().orderByChild('subjectId').equalTo(subjectId).once('value');
  const lowerDesc = description.toLowerCase().trim();
  let match: EventRecord | null = null;
  snap.forEach((child) => {
    const val = child.val();
    if (val.timestamp >= since && val.description?.toLowerCase().trim() === lowerDesc) {
      match = withId<EventRecord>(child.key!, val);
    }
  });
  return match;
}

export async function count(): Promise<number> {
  const snap = await ref().once('value');
  return snap.numChildren();
}

export async function countSince(date: Date): Promise<number> {
  const iso = date.toISOString();
  const snap = await ref().orderByChild('timestamp').startAt(iso).once('value');
  return snap.numChildren();
}
export async function deleteById(id: string): Promise<void> {
  await ref().child(id).remove();
}
