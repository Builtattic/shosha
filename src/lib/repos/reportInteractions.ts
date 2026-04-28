import { adminDb } from '@/lib/firebase/admin';

export type ReportStats = {
  aligns: number;
  opposes: number;
  comments: number;
  shares: number;
};

export type VoteValue = 'align' | 'oppose';

function db() {
  return adminDb();
}

function safeStats(input: unknown): ReportStats {
  const stats = (input ?? {}) as Partial<ReportStats>;
  return {
    aligns: Number(stats.aligns ?? 0),
    opposes: Number(stats.opposes ?? 0),
    comments: Number(stats.comments ?? 0),
    shares: Number(stats.shares ?? 0)
  };
}

export async function getViewerState(reportId: string, userId?: string | null) {
  if (!userId) return { vote: null as VoteValue | null, bookmarked: false };
  const safeKey = `${reportId}__${userId}`.replace(/[.#$/[\]]/g, '_');
  const [voteSnap, bookmarkSnap] = await Promise.all([
    db().ref(`reportVotes/${safeKey}`).once('value'),
    db().ref(`reportBookmarks/${safeKey}`).once('value')
  ]);
  return {
    vote: voteSnap.exists() ? ((voteSnap.val()?.value as VoteValue | undefined) ?? null) : null,
    bookmarked: bookmarkSnap.exists()
  };
}

export async function setVote(reportId: string, userId: string, value: VoteValue) {
  const safeKey = `${reportId}__${userId}`.replace(/[.#$/[\]]/g, '_');
  const reportRef = db().ref(`reports/${reportId}`);
  const voteRef = db().ref(`reportVotes/${safeKey}`);

  const [reportSnap, voteSnap] = await Promise.all([
    reportRef.once('value'),
    voteRef.once('value')
  ]);
  if (!reportSnap.exists()) return null;

  const current = voteSnap.exists() ? (voteSnap.val()?.value as VoteValue | undefined) : undefined;
  const stats = safeStats(reportSnap.val()?.stats);

  if (current === value) {
    stats[value === 'align' ? 'aligns' : 'opposes'] -= 1;
    await voteRef.remove();
  } else {
    if (current === 'align') stats.aligns -= 1;
    if (current === 'oppose') stats.opposes -= 1;
    stats[value === 'align' ? 'aligns' : 'opposes'] += 1;
    await voteRef.set({ reportId, userId, value, updatedAt: new Date().toISOString() });
  }

  await reportRef.update({ stats, updatedAt: new Date().toISOString() });
  return { stats, vote: current === value ? null : value };
}

export async function addComment(reportId: string, userId: string, text: string) {
  const reportRef = db().ref(`reports/${reportId}`);
  const reportSnap = await reportRef.once('value');
  if (!reportSnap.exists()) return null;

  await db().ref('reportComments').push({
    reportId,
    userId,
    text,
    createdAt: new Date().toISOString()
  });

  const stats = safeStats(reportSnap.val()?.stats);
  stats.comments += 1;
  await reportRef.update({ stats, updatedAt: new Date().toISOString() });
  return { stats };
}

export async function addShare(reportId: string) {
  const reportRef = db().ref(`reports/${reportId}`);
  const reportSnap = await reportRef.once('value');
  if (!reportSnap.exists()) return null;

  const stats = safeStats(reportSnap.val()?.stats);
  stats.shares += 1;
  await reportRef.update({ stats, updatedAt: new Date().toISOString() });
  return { stats };
}

export async function toggleBookmark(reportId: string, userId: string) {
  const safeKey = `${reportId}__${userId}`.replace(/[.#$/[\]]/g, '_');
  const bookmarkRef = db().ref(`reportBookmarks/${safeKey}`);
  const snap = await bookmarkRef.once('value');
  if (snap.exists()) {
    await bookmarkRef.remove();
    return { bookmarked: false };
  }
  await bookmarkRef.set({ reportId, userId, createdAt: new Date().toISOString() });
  return { bookmarked: true };
}
