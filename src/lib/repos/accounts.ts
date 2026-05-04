import { adminDb } from '@/lib/firebase/admin';
import { withId, stripUndefined } from '@/lib/repos/_serialize';
import { BASE_SCORE, applySheetScore, calcWorkbookScoreFromEntries } from '@/lib/scoring';
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
  globalScore?: number;
  displayScore?: number;
  windowScores?: {
    baseScore: number;
    w1Delta: number;
    w1Decay: number;
    w1Score: number;
    w2Delta: number;
    w2Decay: number;
    w2Score: number;
    w3Delta: number;
    w3Decay: number;
    w3Score: number;
    finalScore: number;
  };
  profileUserType?: string;
  /** City & country line from workbook (distinct from macro `region`). */
  cityCountry?: string;
  phone?: string;
  /** ISO date string (YYYY-MM-DD). */
  dob?: string;
  age?: number;
  /** External social post count (workbook “NO OF POSTS”). */
  socialPostCount?: number;
  reach?: string;
  educationWorkbook?: string;
  specializedFieldWorkbook?: string;
  managementWorkbook?: string;
  disability?: string;
  lifestyle?: string;
  profileCompletion?: number;
  opposedPosts?: number;
  aiFlaggedPosts?: number;
  disputedPosts?: number;
  disputesLost?: number;
  enrichmentStatus?: AccountEnrichmentStatus;
  role?: string;
  region?: string;
  quote?: string;
  socialLinks?: Partial<Record<Platform, AccountSocialLink>>;
  evidenceSummary?: string;
  usernameLower?: string;
  displayNameLower?: string;
  email?: string;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function deriveId(platform: Platform, username: string) {
  const safeUsername = username
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    // Firebase RTDB keys cannot contain ".", "#", "$", "[", "]" — dots are common in generated handles (e.g. l.6436).
    .replace(/[.#$\[\]]/g, '-')
    .replace(/-+/g, '-')
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
  const safeId = deriveId(platform, username);
  return findById(safeId);
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
  const payload = stripUndefined({
    ...input,
    username: input.username.toLowerCase(),
    usernameLower: input.username.toLowerCase(),
    displayNameLower: (input.displayName ?? '').toLowerCase(),
    createdAt: now,
    updatedAt: now
  });
  await ref().child(id).set(payload);
  return { _id: id, ...payload } as AccountRecord;
}

type WebsiteDossierUser = {
  _id: string;
  username?: string;
  email?: string;
  name?: string;
  bio?: string;
  photoUrl?: string;
  score?: number;
  scoreHistory?: Array<Partial<ScoreHistoryPoint> & { score?: number }>;
};

function defaultBreakdown(): Breakdown {
  return { authenticity: 50, engagement: 50, community: 50, content: 50, impact: 50 };
}

function websiteUsernameForUser(user: WebsiteDossierUser) {
  return (user.username || user.email?.split('@')[0] || user._id || 'user')
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[.#$[\]]/g, '-')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export async function ensureWebsiteAccountForUser(user: WebsiteDossierUser): Promise<AccountRecord> {
  const username = websiteUsernameForUser(user);
  const id = deriveId('website', username);
  const displayName = user.name || username;
  const now = new Date().toISOString();
  const score = typeof user.score === 'number' ? user.score : BASE_SCORE;
  const scoreHistory = Array.isArray(user.scoreHistory) && user.scoreHistory.length
    ? user.scoreHistory.map((point) => ({
        ...point,
        t: point.t ?? now,
        s: point.s ?? point.score ?? score,
        cause: point.cause ?? 'seed' as const,
      }))
    : [{ t: now, s: score, cause: 'seed' as const }];
  const avatarUrl = user.photoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  const existing = await findById(id);
  if (existing) {
    const updated = await update(id, {
      username,
      displayName,
      bio: user.bio || existing.bio || 'Platform User',
      avatarUrl,
      verified: true,
      followers: existing.followers || 'registered',
      claimed: true,
      claimedBy: user._id,
      claimable: false,
      profileKind: existing.profileKind ?? 'standard',
      credibility: existing.credibility ?? 80,
      enrichmentStatus: existing.enrichmentStatus ?? 'none',
      role: existing.role ?? 'Platform User',
    });
    return updated!;
  }

  return createWithId(id, {
    platform: 'website',
    username,
    displayName,
    bio: user.bio || 'Platform User',
    avatarUrl,
    verified: true,
    followers: 'registered',
    profileKind: 'standard',
    claimable: false,
    credibility: 80,
    enrichmentStatus: 'none',
    role: 'Platform User',
    score,
    displayScore: score,
    scoreHistory,
    breakdown: defaultBreakdown(),
    posts: [],
    claimed: true,
    claimedBy: user._id,
  });
}

export async function update(id: string, partial: Partial<AccountRecord>): Promise<AccountRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  if (typeof partial.displayName === 'string') patch.displayNameLower = (partial.displayName ?? '').toLowerCase();
  if (typeof partial.username === 'string') patch.usernameLower = partial.username.toLowerCase();
  delete patch._id;
  await ref().child(id).update(stripUndefined(patch));
  return (await findById(id))!;
}

export async function listTop(limit = 50): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('score').limitToLast(limit).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function listBottom(limit = 50): Promise<AccountRecord[]> {
  const snap = await ref().orderByChild('score').limitToFirst(limit).once('value');
  const results: AccountRecord[] = [];
  snap.forEach((child) => {
    results.push(withId<AccountRecord>(child.key!, child.val()));
  });
  return results;
}

/** Normalize social URLs for dedup comparison: no scheme, no www, no trailing slash, lowercase. */
export function normalizeSocialUrl(url: string): string {
  let u = url.trim().toLowerCase();
  u = u.replace(/^https?:\/\//, '');
  u = u.replace(/^www\./, '');
  u = u.replace(/\/+$/, '');
  return u;
}

export async function search(q: string, limit = 20): Promise<AccountRecord[]> {
  const cleaned = q.trim().toLowerCase();
  if (!cleaned) return listTop(limit);
  
  // Username matches first, then display-name prefix matches (deduped by _id).
  const rangeQuery = (field: 'usernameLower' | 'displayNameLower') =>
    ref()
      .orderByChild(field)
      .startAt(cleaned)
      .endAt(cleaned + '\uf8ff')
      .limitToFirst(limit)
      .once('value');

  const [snapUser, snapDisplay] = await Promise.all([rangeQuery('usernameLower'), rangeQuery('displayNameLower')]);
  const byId = new Map<string, AccountRecord>();
  
  snapUser.forEach((child) => {
    byId.set(child.key!, withId<AccountRecord>(child.key!, child.val()));
  });
  
  snapDisplay.forEach((child) => {
    const id = child.key!;
    if (!byId.has(id)) byId.set(id, withId<AccountRecord>(id, child.val()));
  });
  
  return Array.from(byId.values()).slice(0, limit);
}

/** Full scan of accounts — O(n); used server-side for URL dedup across nested socialLinks. */
export async function findBySocialUrl(url: string): Promise<AccountRecord | null> {
  const target = normalizeSocialUrl(url);
  if (!target) return null;
  const snap = await ref().once('value');
  if (!snap.exists()) return null;
  let match: AccountRecord | null = null;
  snap.forEach((child) => {
    if (match) return true;
    const acc = withId<AccountRecord>(child.key!, child.val());
    const links = acc.socialLinks;
    if (!links) return;
    for (const link of Object.values(links)) {
      if (link?.url && normalizeSocialUrl(link.url) === target) {
        match = acc;
        return true;
      }
    }
  });
  return match;
}

export async function findByDisplayName(name: string): Promise<AccountRecord | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const snap = await ref().orderByChild('displayNameLower').equalTo(key).limitToFirst(1).once('value');
  if (!snap.exists()) return null;
  let found: AccountRecord | null = null;
  snap.forEach((child) => {
    found = withId<AccountRecord>(child.key!, child.val());
  });
  return found;
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
  await ref().child(id).update(stripUndefined(patch));
  return findById(id);
}

export async function rebuildLedger(id: string, entries: ScoreHistoryPoint[]): Promise<AccountRecord | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const tracker = calcWorkbookScoreFromEntries(entries.map((entry) => ({ t: entry.t, delta: entry.delta ?? 0 })), BASE_SCORE);
  const globalScore = entries.reduce((sum, entry) => sum + (entry.delta ?? 0), 0);
  let score = BASE_SCORE;
  const seededHistory: ScoreHistoryPoint[] = [
    { t: existing.createdAt ?? new Date().toISOString(), s: BASE_SCORE, cause: 'seed' },
  ];
  for (const entry of entries) {
    const applied = applySheetScore(score, entry.delta ?? 0);
    score = applied.score;
    seededHistory.push({ ...entry, s: score, decay: entry.decay ?? applied.decay });
  }
  await ref().child(id).update(stripUndefined({
    score: tracker.finalScore,
    displayScore: tracker.finalScore,
    globalScore,
    windowScores: tracker,
    scoreHistory: seededHistory,
    updatedAt: new Date().toISOString(),
  }));
  return findById(id);
}
