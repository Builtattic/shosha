import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import type { EventMultipliers } from '@/lib/scoring';

export type ReportMetadataRecord = {
  _id: string;
  reportId: string;
  profileId: string;
  multipliers: EventMultipliers;
  labels?: Partial<Record<keyof EventMultipliers, string>>;
  multiplierQuotient: number;
  formulaVersion: string;
  sourceFields?: Record<string, unknown>;
  adminOverrides?: Partial<EventMultipliers>;
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('reportMetadata');
}

export async function upsert(reportId: string, input: Omit<ReportMetadataRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ReportMetadataRecord> {
  const existing = await findByReportId(reportId);
  const now = new Date().toISOString();
  if (existing) {
    await ref().child(existing._id).update({ ...input, updatedAt: now });
    return (await findById(existing._id))!;
  }
  const newRef = ref().push();
  const payload = { ...input, createdAt: now, updatedAt: now };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function findById(id: string): Promise<ReportMetadataRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<ReportMetadataRecord>(snap.key!, snap.val());
}

export async function findByReportId(reportId: string): Promise<ReportMetadataRecord | null> {
  const snap = await ref().orderByChild('reportId').equalTo(reportId).limitToFirst(1).once('value');
  if (!snap.exists()) return null;
  let result: ReportMetadataRecord | null = null;
  snap.forEach((child) => {
    result = withId<ReportMetadataRecord>(child.key!, child.val());
  });
  return result;
}

