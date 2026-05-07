import { adminDb } from '@/lib/firebase/admin';
import { withId, stripUndefined } from '@/lib/repos/_serialize';
import { approvalThreshold } from '@/lib/bubbleRules';

export type BubbleType = 'family' | 'friend_group' | 'college_group' | 'work_group' | 'company' | 'sports_group' | 'other';
export type BubbleVisibility = 'public' | 'private';
export type BubbleMemberRole = 'owner' | 'admin' | 'member';
export type BubbleJoinStatus = 'pending' | 'approved' | 'rejected';

export type BubbleRecord = {
  _id: string;
  name: string;
  tagline?: string;
  description: string;
  type: BubbleType;
  category?: string;
  coverImageUrl?: string;
  imageUrl?: string;
  createdBy: string;
  createdByAdmin: boolean;
  visibility: BubbleVisibility;
  sourceLinks?: string[];
  createdAt: string;
  updatedAt: string;
};

export type BubbleMemberRecord = {
  _id: string;
  bubbleId: string;
  userId: string;
  role: BubbleMemberRole;
  score: number;
  previousRank?: number;
  joinedAt: string;
};

export type BubbleJoinRequestRecord = {
  _id: string;
  bubbleId: string;
  userId: string;
  status: BubbleJoinStatus;
  approvals: string[];
  rejections: string[];
  createdAt: string;
  updatedAt: string;
};

function db() {
  return adminDb();
}

function memberKey(bubbleId: string, userId: string) {
  return `${bubbleId}__${userId}`.replace(/[.#$/[\]]/g, '_');
}

export async function create(input: Omit<BubbleRecord, '_id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const newRef = db().ref('bubbles').push();
  const payload = stripUndefined({ ...input, createdAt: now, updatedAt: now });
  await newRef.set(payload);
  await db().ref(`bubbleMembers/${memberKey(newRef.key!, input.createdBy)}`).set({
    bubbleId: newRef.key!,
    userId: input.createdBy,
    role: 'owner',
    score: 0,
    joinedAt: now,
  });
  return { _id: newRef.key!, ...payload } as BubbleRecord;
}

export async function findById(id: string): Promise<BubbleRecord | null> {
  const snap = await db().ref(`bubbles/${id}`).once('value');
  if (!snap.exists()) return null;
  return withId<BubbleRecord>(snap.key!, snap.val());
}

export async function list(limit = 50): Promise<BubbleRecord[]> {
  const snap = await db().ref('bubbles').orderByChild('createdAt').limitToLast(limit).once('value');
  const out: BubbleRecord[] = [];
  snap.forEach((child) => {
    out.push(withId<BubbleRecord>(child.key!, child.val()));
  });
  return out.reverse();
}

export async function listMembers(bubbleId: string): Promise<BubbleMemberRecord[]> {
  const snap = await db().ref('bubbleMembers').orderByChild('bubbleId').equalTo(bubbleId).once('value');
  const out: BubbleMemberRecord[] = [];
  snap.forEach((child) => {
    out.push(withId<BubbleMemberRecord>(child.key!, child.val()));
  });
  return out.sort((a, b) => b.score - a.score);
}

export async function requestJoin(bubbleId: string, userId: string) {
  const existingMember = await db().ref(`bubbleMembers/${memberKey(bubbleId, userId)}`).once('value');
  if (existingMember.exists()) return { alreadyMember: true as const };
  const key = memberKey(bubbleId, userId);
  const now = new Date().toISOString();
  const existing = await db().ref(`bubbleJoinRequests/${key}`).once('value');
  const payload = {
    bubbleId,
    userId,
    status: 'pending',
    approvals: existing.val()?.approvals ?? [],
    rejections: existing.val()?.rejections ?? [],
    createdAt: existing.val()?.createdAt ?? now,
    updatedAt: now,
  };
  await db().ref(`bubbleJoinRequests/${key}`).set(payload);
  return { _id: key, ...payload } as BubbleJoinRequestRecord;
}

export async function voteJoinRequest(input: {
  bubbleId: string;
  targetUserId: string;
  voterId: string;
  vote: 'approve' | 'reject';
}) {
  const key = memberKey(input.bubbleId, input.targetUserId);
  const [requestSnap, memberSnap] = await Promise.all([
    db().ref(`bubbleJoinRequests/${key}`).once('value'),
    db().ref('bubbleMembers').orderByChild('bubbleId').equalTo(input.bubbleId).once('value'),
  ]);
  if (!requestSnap.exists()) return null;

  const members: BubbleMemberRecord[] = [];
  memberSnap.forEach((child) => {
    members.push(withId<BubbleMemberRecord>(child.key!, child.val()));
  });
  if (!members.some((member) => member.userId === input.voterId)) return null;

  const current = requestSnap.val() as BubbleJoinRequestRecord;
  const approvals = new Set(current.approvals ?? []);
  const rejections = new Set(current.rejections ?? []);
  approvals.delete(input.voterId);
  rejections.delete(input.voterId);
  if (input.vote === 'approve') approvals.add(input.voterId);
  else rejections.add(input.voterId);

  const threshold = approvalThreshold(members.length);
  const status: BubbleJoinStatus = approvals.size >= threshold ? 'approved' : rejections.size >= threshold ? 'rejected' : 'pending';
  const now = new Date().toISOString();
  await db().ref(`bubbleJoinRequests/${key}`).update({
    approvals: Array.from(approvals),
    rejections: Array.from(rejections),
    status,
    updatedAt: now,
  });

  if (status === 'approved') {
    await db().ref(`bubbleMembers/${key}`).set({
      bubbleId: input.bubbleId,
      userId: input.targetUserId,
      role: 'member',
      score: 0,
      joinedAt: now,
    });
  }

  return findJoinRequest(key);
}

export async function findJoinRequest(id: string): Promise<BubbleJoinRequestRecord | null> {
  const snap = await db().ref(`bubbleJoinRequests/${id}`).once('value');
  if (!snap.exists()) return null;
  return withId<BubbleJoinRequestRecord>(snap.key!, snap.val());
}

export async function listJoinRequests(bubbleId: string): Promise<BubbleJoinRequestRecord[]> {
  const snap = await db().ref('bubbleJoinRequests').orderByChild('bubbleId').equalTo(bubbleId).once('value');
  const out: BubbleJoinRequestRecord[] = [];
  snap.forEach((child) => {
    out.push(withId<BubbleJoinRequestRecord>(child.key!, child.val()));
  });
  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
