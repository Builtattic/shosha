import { adminDb } from '@/lib/firebase/admin';
import { withId, stripUndefined } from '@/lib/repos/_serialize';
import type { EventMultipliers } from '@/lib/scoring';

export type LedgerEntryRecord = {
  _id: string;
  profileId: string;
  reportId: string;
  baseScore: number;
  multipliers: EventMultipliers;
  multiplierQuotient: number;
  delta: number;
  timestamp: string;
  formulaVersion: string;
  weight?: number;
  capped?: boolean;
  reversalOfLedgerId?: string;
  category?: string;
  deed?: string;
  createdAt?: string;
};

function ref() {
  return adminDb().ref('ledgerEntries');
}

export async function createWithId(id: string, input: Omit<LedgerEntryRecord, '_id' | 'createdAt'>): Promise<LedgerEntryRecord> {
  const existing = await findById(id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const payload = { ...input, createdAt: now };
  await ref().child(id).set(stripUndefined(payload));
  return { _id: id, ...payload };
}

export async function findById(id: string): Promise<LedgerEntryRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<LedgerEntryRecord>(snap.key!, snap.val());
}

export async function findByReportId(reportId: string): Promise<LedgerEntryRecord | null> {
  const snap = await ref().orderByChild('reportId').equalTo(reportId).limitToFirst(1).once('value');
  if (!snap.exists()) return null;
  let result: LedgerEntryRecord | null = null;
  snap.forEach((child) => {
    result = withId<LedgerEntryRecord>(child.key!, child.val());
  });
  return result;
}

export async function listForProfile(profileId: string, limit = 1000): Promise<LedgerEntryRecord[]> {
  const snap = await ref().orderByChild('profileId').equalTo(profileId).limitToLast(limit).once('value');
  const results: LedgerEntryRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<LedgerEntryRecord>(child.key!, child.val()));
  });
  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function remove(id: string): Promise<void> {
  await ref().child(id).remove();
}

export async function removeByReportId(reportId: string): Promise<void> {
  const entry = await findByReportId(reportId);
  if (entry) await remove(entry._id);
}
