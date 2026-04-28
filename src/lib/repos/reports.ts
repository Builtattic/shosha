import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import type { ReportType, ReportStatus, Platform } from '@/types';

export type ReportMedia = {
  url: string;
  type: 'image' | 'video';
  bytes: number;
  width?: number;
  height?: number;
  publicId?: string;
};

export type AiVerdictRecord = {
  valid: boolean;
  confidence: number;
  proposedImpact: number;
  reasoning: string;
  categoryTags: string[];
  abuseFlags: string[];
  analyzedAt: string;
};

export type AdminDecisionRecord = {
  adminId: string;
  verdict: 'approved' | 'rejected';
  finalImpact: number;
  note: string;
  decidedAt: string;
};

export type ReportRecord = {
  _id: string;
  accountId: string;
  reporterId: string | null;
  anonymousTag: string;
  type: ReportType;
  description: string;
  feelings: string;
  media: ReportMedia;
  status: ReportStatus;
  aiVerdict: AiVerdictRecord | null;
  adminDecision: AdminDecisionRecord | null;
  stats?: {
    aligns: number;
    opposes: number;
    comments: number;
    shares: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

function ref() {
  return adminDb().ref('reports');
}

export async function findById(id: string): Promise<ReportRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<ReportRecord>(snap.key!, snap.val());
}

export type CreateReportInput = Omit<ReportRecord, '_id' | 'createdAt' | 'updatedAt'>;

export async function create(input: CreateReportInput): Promise<ReportRecord> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = {
    ...input,
    stats: input.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 },
    createdAt: now,
    updatedAt: now
  };
  await newRef.set(payload);
  return { _id: newRef.key!, ...payload };
}

export async function update(id: string, partial: Partial<ReportRecord>): Promise<ReportRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}

export async function listForAccount(accountId: string, statusIn: ReportStatus[], limit = 50): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('accountId').equalTo(accountId).once('value');
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (statusIn.includes(val.status)) {
      results.push(withId<ReportRecord>(child.key!, val));
    }
  });
  return results.slice(0, limit);
}

export async function listAll(limit = 100): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<ReportRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listPublicFeed(limit = 50): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit * 2).once('value');
  const validStatuses: ReportStatus[] = ['approved', 'ai_reviewed', 'flagged'];
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (validStatuses.includes(val.status)) {
      results.push(withId<ReportRecord>(child.key!, val));
    }
  });
  return results.reverse().slice(0, limit);
}

export async function listByReporter(reporterId: string, limit = 50): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('reporterId').equalTo(reporterId).limitToLast(limit).once('value');
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<ReportRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listQueue(filter: { type?: ReportType; sort?: 'confidence' | 'date' } = {}, limit = 100): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit * 2).once('value');
  const queueStatuses: ReportStatus[] = ['ai_reviewed', 'pending_ai', 'flagged'];
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (queueStatuses.includes(val.status)) {
      if (!filter.type || val.type === filter.type) {
        results.push(withId<ReportRecord>(child.key!, val));
      }
    }
  });
  if (filter.sort === 'confidence') {
    results.sort((a, b) => (b.aiVerdict?.confidence ?? 0) - (a.aiVerdict?.confidence ?? 0));
  } else {
    results.reverse();
  }
  return results.slice(0, limit);
}

export async function listAbuse(limit = 100): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit * 3).once('value');
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (val.aiVerdict?.abuseFlags && val.aiVerdict.abuseFlags.length > 0) {
      results.push(withId<ReportRecord>(child.key!, val));
    }
  });
  return results.reverse().slice(0, limit);
}

export async function count(): Promise<number> {
  const snap = await ref().once('value');
  return snap.numChildren();
}

export async function countSince(date: Date): Promise<number> {
  const snap = await ref().orderByChild('createdAt').startAt(date.toISOString()).once('value');
  return snap.numChildren();
}

export async function countByStatus(statusIn: ReportStatus[]): Promise<number> {
  const snap = await ref().once('value');
  let count = 0;
  snap.forEach((child) => {
    if (statusIn.includes(child.val().status)) count++;
  });
  return count;
}

export async function listDecided(limit = 500): Promise<ReportRecord[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit * 2).once('value');
  const results: ReportRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if ((val.status === 'approved' || val.status === 'rejected') && val.aiVerdict) {
      results.push(withId<ReportRecord>(child.key!, val));
    }
  });
  return results.reverse().slice(0, limit);
}

export type EnrichedReport = ReportRecord & { account?: { _id: string; displayName: string; platform: Platform; score: number; bio?: string } };
