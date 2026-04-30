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

export type CommentRecord = {
  _id: string;
  reportId: string;
  userId: string;
  text: string;
  createdAt: string;
};

export async function addComment(reportId: string, userId: string, text: string) {
  const reportRef = db().ref(`reports/${reportId}`);
  const reportSnap = await reportRef.once('value');
  if (!reportSnap.exists()) return null;

  const commentRef = await db().ref('reportComments').push({
    reportId,
    userId,
    text,
    createdAt: new Date().toISOString()
  });

  const stats = safeStats(reportSnap.val()?.stats);
  stats.comments += 1;
  await reportRef.update({ stats, updatedAt: new Date().toISOString() });
  return { stats, commentId: commentRef.key ?? undefined };
}

export async function listComments(reportId: string, limit = 100): Promise<CommentRecord[]> {
  const snap = await db()
    .ref('reportComments')
    .orderByChild('reportId')
    .equalTo(reportId)
    .limitToLast(limit)
    .once('value');
  if (!snap.exists()) return [];
  const out: CommentRecord[] = [];
  snap.forEach((child) => {
    const value = child.val() ?? {};
    out.push({
      _id: child.key!,
      reportId: value.reportId,
      userId: value.userId,
      text: value.text,
      createdAt: value.createdAt
    });
  });
  return out.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
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

export type BookmarkRecord = {
  reportId: string;
  userId: string;
  createdAt: string;
};

export async function listBookmarksForUser(userId: string, limit = 100): Promise<BookmarkRecord[]> {
  const snap = await db()
    .ref('reportBookmarks')
    .orderByChild('userId')
    .equalTo(userId)
    .limitToLast(limit)
    .once('value');
  if (!snap.exists()) return [];
  const out: BookmarkRecord[] = [];
  snap.forEach((child) => {
    const value = child.val() ?? {};
    if (value.reportId && value.userId) {
      out.push({ reportId: value.reportId, userId: value.userId, createdAt: value.createdAt ?? '' });
    }
  });
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
