import { adminDb } from '@/lib/firebase/admin';
import { stripUndefined, withId } from '@/lib/repos/_serialize';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export type IssueReport = {
  _id: string;
  name: string;
  email: string;
  issueType: string;
  page: string;
  title: string;
  details: string;
  attachmentUrls?: string[];
  device?: string;
  browser?: string;
  severity?: string;
  status: IssueStatus;
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
};

function ref() {
  return adminDb().ref('issueReports');
}

export async function create(
  input: Omit<IssueReport, '_id' | 'createdAt' | 'updatedAt'>
): Promise<IssueReport> {
  const now = new Date().toISOString();
  const newRef = ref().push();
  const payload = stripUndefined({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  await newRef.set(payload);
  return withId<IssueReport>(newRef.key!, payload);
}

export async function listOpen(): Promise<IssueReport[]> {
  const snap = await ref().orderByChild('status').equalTo('open').once('value');
  const out: IssueReport[] = [];
  snap.forEach((child) => {
    out.push(withId<IssueReport>(child.key!, child.val()));
  });
  return out.sort((a, b) => (a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1);
}

export async function listAll(limit = 100): Promise<IssueReport[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const out: IssueReport[] = [];
  snap.forEach((child) => {
    out.push(withId<IssueReport>(child.key!, child.val()));
  });
  return out.reverse();
}

export async function findById(id: string): Promise<IssueReport | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<IssueReport>(snap.key!, snap.val());
}

export async function update(id: string, partial: Partial<IssueReport>): Promise<IssueReport | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch = stripUndefined({
    ...partial,
    updatedAt: new Date().toISOString(),
  });
  delete (patch as { _id?: string })._id;
  await ref().child(id).update(patch);
  return findById(id);
}
