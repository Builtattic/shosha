import { adminDb } from '@/lib/firebase/admin';
import { withId } from '@/lib/repos/_serialize';
import { BASE_SCORE, applySheetScore } from '@/lib/scoring';
import type { Breakdown, Platform, ScoreCause } from '@/types';

export type ScoreHistoryPoint = {
  t: string;
  s: number;
  cause: ScoreCause;
  delta?: number;
  baseScore?: number;
  profileId?: string;
  weekId?: string;
  multiplierQuotient?: number;
  decay?: number;
  category?: string;
  deed?: string;
  eventId?: string;
  multipliers?: Record<string, number>;
};

export type SocialPostRecord = {
  externalId: string;
  content: string;
  likes: string;
  replies: string;
  mediaUrl?: string;
  capturedAt: string;
};

export type AccountProfileKind = 'standard' | 'public_figure';
export type AccountEnrichmentStatus = 'none' | 'pending' | 'reviewed' | 'stale';

export type AccountSocialLink = {
  url: string;
  username?: string;
  displayName?: string;
  followers?: string;
  verified?: boolean;
  confidence?: number;
  reason?: string;
  sourceUrls?: string[];
  lastCheckedAt?: string;
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
  profileId?: string;
  profileKind?: AccountProfileKind;
  claimable?: boolean;
  credibility?: number;
  enrichmentStatus?: AccountEnrichmentStatus;
  role?: string;
  region?: string;
  quote?: string;
  socialLinks?: Partial<Record<Platform, AccountSocialLink>>;
  evidenceSummary?: string;
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
  return createWithId(id, input);
}

export async function createWithId(
  id: string,
  input: Omit<AccountRecord, '_id' | 'createdAt' | 'updatedAt' | 'usernameLower' | 'displayNameLower'>
): Promise<AccountRecord> {
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

export async function ensureLedger(id: string): Promise<AccountRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = {};
  if (typeof existing.score !== 'number') patch.score = BASE_SCORE;
  if (!Array.isArray(existing.scoreHistory)) {
    patch.scoreHistory = [{ t: existing.createdAt ?? new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }];
  }
  if (Object.keys(patch).length === 0) return existing;
  patch.updatedAt = new Date().toISOString();
  await ref().child(id).update(patch);
  return findById(id);
}

export async function rebuildLedger(id: string, entries: ScoreHistoryPoint[]): Promise<AccountRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  let score = BASE_SCORE;
  const seededHistory: ScoreHistoryPoint[] = [
    { t: existing.createdAt ?? new Date().toISOString(), s: BASE_SCORE, cause: 'seed' },
  ];
  for (const entry of entries) {
    const applied = applySheetScore(score, entry.delta ?? 0);
    score = applied.score;
    seededHistory.push({ ...entry, s: score, decay: entry.decay ?? applied.decay });
  }
  await ref().child(id).update({
    score,
    scoreHistory: seededHistory,
    updatedAt: new Date().toISOString(),
  });
  return findById(id);
}
