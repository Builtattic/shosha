import { adminDb } from '@/lib/firebase/admin';
import { withId, stripId } from '@/lib/repos/_serialize';

export type UserRole = 'user' | 'admin';

export type OccupationRole =
  | 'student'
  | 'unemployed'
  | 'individual_contributor'
  | 'manager'
  | 'founder_business_owner'
  | 'public_figure_influencer'
  | 'government_political';

export type NetworkSize = 'none' | '<1k' | '1k-10k' | '10k-100k' | '100k-1m' | '1m-100m' | '100m+';

export type EducationLevel =
  | 'no_formal'
  | 'school'
  | 'undergraduate'
  | 'postgraduate'
  | 'doctorate_specialized';

export type SpecializedFieldLevel = 'no' | 'some_experience' | 'professional' | 'expert';

export type ManagementLevel =
  | 'none'
  | 'small_team_limited_control'
  | 'moderate_responsibility'
  | 'large_team_major_decisions'
  | 'organizational_institutional';

export type LimitationsStatus = 'yes' | 'no' | 'prefer_not_to_say';

export type LedgerEntryRecord = {
  t: string;
  delta: number;
  cause: 'seed' | 'report' | 'audit' | 'decay';
  category?: string;
  eventId?: string;
  multipliers?: Record<string, number>;
};

export type WeeklyStats = {
  weekStart: string;
  weekEnd: string;
  P: number;
  N: number;
  ratio: number;
  decayFactor: number;
  scoreAtSnapshot: number;
};

export type AppUser = {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  reporterScore: number;
  claimedAccounts: string[];
  createdAt?: string;
  updatedAt?: string;
  // Continuous reputation ledger (Score₀ = 1000)
  score?: number;
  scoreHistory?: LedgerEntryRecord[];
  weeklyStats?: WeeklyStats;
  // Onboarding profile fields
  onboardingComplete?: boolean;
  name?: string;
  phone?: string;
  dob?: string;
  city?: string;
  country?: string;
  occupationRole?: OccupationRole;
  networkSize?: NetworkSize;
  education?: EducationLevel;
  specializedField?: SpecializedFieldLevel;
  managesMoneyPeopleSystem?: ManagementLevel;
  physicalIntellectualLimitations?: LimitationsStatus;
  igUrl?: string;
  tiktokUrl?: string;
  xUrl?: string;
  linkedinUrl?: string;
  redditUrl?: string;
  ytUrl?: string;
  fbUrl?: string;
  snapchatUrl?: string;
};

function ref() {
  return adminDb().ref('users');
}

export async function findById(id: string): Promise<AppUser | null> {
  const snap = await ref().child(id).once('value');
  if (!snap.exists()) return null;
  return withId<AppUser>(snap.key!, snap.val());
}

export async function upsertFromClerk(input: {
  id: string;
  username: string;
  email: string;
  role?: UserRole;
}): Promise<AppUser> {
  const existing = await findById(input.id);
  const now = new Date().toISOString();
  if (existing) {
    const update: Record<string, unknown> = {
      username: input.username,
      email: input.email,
      updatedAt: now
    };
    if (input.role) update.role = input.role;
    await ref().child(input.id).update(update);
    return (await findById(input.id))!;
  }
  const seed: Omit<AppUser, '_id'> = {
    username: input.username,
    email: input.email,
    role: input.role ?? 'user',
    reporterScore: 50,
    claimedAccounts: [],
    score: 1000,
    scoreHistory: [],
    createdAt: now,
    updatedAt: now
  };
  await ref().child(input.id).set(seed);
  return { _id: input.id, ...seed };
}

// Backfill score=1000 / empty scoreHistory for existing users that predate the ledger.
// Idempotent: only writes if the field is missing.
export async function ensureLedger(id: string): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = {};
  if (typeof existing.score !== 'number') patch.score = 1000;
  if (!Array.isArray(existing.scoreHistory)) patch.scoreHistory = [];
  if (Object.keys(patch).length === 0) return existing;
  patch.updatedAt = new Date().toISOString();
  await ref().child(id).update(patch);
  return findById(id);
}

// Reset and rebuild a user's ledger from a chronologically-ordered list of entries.
// Used by the replay service after recomputing every approved report's Δ.
export async function rebuildLedger(id: string, entries: LedgerEntryRecord[]): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const finalScore = entries.reduce((sum, e) => sum + (e.delta ?? 0), 1000);
  await ref().child(id).update({
    score: Math.round(finalScore),
    scoreHistory: entries,
    updatedAt: new Date().toISOString()
  });
  return findById(id);
}

export async function applyDelta(
  id: string,
  delta: number,
  entry: Omit<LedgerEntryRecord, 'delta' | 't'>
): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const currentScore = typeof existing.score === 'number' ? existing.score : 1000;
  const nextScore = Math.round(currentScore + delta);
  const history = existing.scoreHistory ?? [];
  const next: LedgerEntryRecord = { ...entry, delta, t: new Date().toISOString() };
  await ref().child(id).update({
    score: nextScore,
    scoreHistory: [...history, next],
    updatedAt: new Date().toISOString()
  });
  return findById(id);
}

export async function setReporterScore(id: string, value: number): Promise<void> {
  await ref().child(id).update({ reporterScore: value, updatedAt: new Date().toISOString() });
}

export async function addClaimedAccount(id: string, accountId: string): Promise<void> {
  const user = await findById(id);
  if (!user) return;
  const accounts = user.claimedAccounts ?? [];
  if (!accounts.includes(accountId)) accounts.push(accountId);
  await ref().child(id).update({ claimedAccounts: accounts, updatedAt: new Date().toISOString() });
}

export async function findByUsername(username: string): Promise<AppUser | null> {
  const snap = await ref().orderByChild('username').equalTo(username.toLowerCase()).limitToFirst(1).once('value');
  if (!snap.exists()) return null;
  let result: AppUser | null = null;
  snap.forEach((child) => {
    result = withId<AppUser>(child.key!, child.val());
  });
  return result;
}

export async function listAll(limit = 200): Promise<AppUser[]> {
  const snap = await ref().orderByChild('createdAt').limitToLast(limit).once('value');
  const results: AppUser[] = [];
  snap.forEach((child) => {
    results.push(withId<AppUser>(child.key!, child.val()));
  });
  return results.reverse();
}

export async function count(): Promise<number> {
  const snap = await ref().once('value');
  return snap.numChildren();
}

export async function updateRole(id: string, role: UserRole): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  await ref().child(id).update({ role, updatedAt: new Date().toISOString() });
  return (await findById(id))!;
}

export async function update(id: string, partial: Partial<Omit<AppUser, '_id'>>): Promise<AppUser | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { ...partial, updatedAt: new Date().toISOString() };
  delete patch._id;
  await ref().child(id).update(patch);
  return (await findById(id))!;
}
