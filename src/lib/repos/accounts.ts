import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import type { Breakdown, Platform, ScoreCause } from '@/types';

export type ScoreHistoryPoint = { t: string; s: number; cause: ScoreCause };

export type SocialPostRecord = {
  externalId: string;
  content: string;
  likes: string;
  replies: string;
  mediaUrl?: string;
  capturedAt: string;
};

export type AccountRecord = {
  _id: string;
  platform: Platform;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  followers: string;
  score: number;
  scoreHistory: ScoreHistoryPoint[];
  breakdown: Breakdown;
  posts: SocialPostRecord[];
  claimed: boolean;
  claimedBy: string | null;
  usernameLower?: string;
  displayNameLower?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function deriveId(platform: Platform, username: string) {
  const safeUsername = username
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
  return `${platform}_${safeUsername || 'profile'}`;
}

function ref() {
  return adminDb().ref('accounts');
}

export async function findById(id: string): Promise<AccountRecord | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<AccountRecord>(snap.key!, snap.val());
}

export async function findByPlatformUsername(platform: Platform, username: string): Promise<AccountRecord | null> {
  return findById(deriveId(platform, username));
}

export async function create(input: Omit<AccountRecord, '_id' | 'createdAt' | 'updatedAt' | 'usernameLower' | 'displayNameLower'>): Promise<AccountRecord> {
  const id = deriveId(input.platform, input.username);
  const now = new Date().toISOString();
  const payload = {
    ...input,
    username: input.username.toLowerCase(),
    usernameLower: input.username.toLowerCase(),
    displayNameLower: input.displayName.toLowerCase(),
    createdAt: now,
    updatedAt: now
  };
  await ref().child(id).set(payload);
  return { _id: id, ...payload };
}

export async function update(id: string, partial: Partial<AccountRecord>): Promise<AccountRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  if (typeof partial.displayName === 'string') patch.displayNameLower = partial.displayName.toLowerCase();
  if (typeof partial.username === 'string') patch.usernameLower = partial.username.toLowerCase();
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}

export async function listTop(limit = 50): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('score').limitToLast(limit).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results.reverse(); // limitToLast gives ascending, we want descending
}

export async function listBottom(limit = 50): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('score').limitToFirst(limit).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results;
}

export async function search(q: string, limit = 20): Promise<AccountRecord[]> {
  const cleaned = q.trim().toLowerCase();
  if (!cleaned) return listTop(limit);
  // RTDB doesn't support LIKE queries, so we do startAt/endAt on usernameLower
  const snap = await ref()
    .orderByChild('usernameLower')
    .startAt(cleaned)
    .endAt(cleaned + '\uf8ff')
    .limitToFirst(limit)
    .once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results;
}

export async function count(): Promise<number> {
  const snap = await ref().once('value');
  return snap.numChildren();
}

export async function listClaimedBy(userId: string): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('claimedBy').equalTo(userId).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results;
}

export async function listAll(limit = 200): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('score').limitToLast(limit).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function deleteById(id: string): Promise<void> {
  await ref().child(id).remove();
}

export async function setScore(id: string, score: number): Promise<AccountRecord | null> {
  return update(id, { score });
}
