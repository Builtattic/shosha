import { cached, cacheKey, invalidateCacheKey } from '@/lib/cache';
import * as accountsRepo from '@/lib/repos/accounts';
import type { AccountRecord } from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import type { ReportRecord } from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import { hidesReporterOnPublicSurfaces } from '@/lib/reportPrivacy';
import { BASE_SCORE, calcProfileCredibility } from '@/lib/scoring';

const PROFILE_CACHE_TTL = 60;

export type ReporterSummary = Pick<usersRepo.AppUser, '_id' | 'username' | 'name' | 'photoUrl' | 'role'>;

export type ProfileMetrics = {
  history: NonNullable<AccountRecord['scoreHistory']>;
  delta: number;
  weeklyDelta: number;
  totalPositiveImpact: number;
  totalNegativeImpact: number;
  profileCredibility: number;
};

export type ProfileBundle = {
  account: AccountRecord;
  filingsRaw: ReportRecord[];
  reporters: ReporterSummary[];
  similarProfiles: AccountRecord[];
  metrics: ProfileMetrics;
};

function summarizeReporter(user: usersRepo.AppUser): ReporterSummary {
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    photoUrl: user.photoUrl,
    role: user.role
  };
}

function sanitizeBundleAccount(account: AccountRecord): AccountRecord {
  const safe = { ...account };
  delete safe.email;
  if (safe.platform === 'website') {
    delete safe.region;
    delete safe.sourceUrl;
    delete safe.socialLinks;
  }
  return safe;
}

export function deriveProfileMetrics(account: AccountRecord): ProfileMetrics {
  const history = account.scoreHistory?.length
    ? account.scoreHistory
    : [{ t: account.createdAt ?? new Date().toISOString(), s: account.score, cause: 'seed' as const }];

  const previous = history.length > 1 ? history[history.length - 2].s : BASE_SCORE;
  const delta = Number(((account.score ?? BASE_SCORE) - previous).toFixed(2));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyDeltaRaw = history
    .filter((h: any) => h.t && new Date(h.t).getTime() >= weekAgo)
    .reduce((sum: number, h: any) => sum + (h.delta ?? 0), 0);
  const weeklyDelta = Number(weeklyDeltaRaw.toFixed(2));

  const totalPositiveImpact = history.reduce(
    (sum: number, h: any) => sum + (h.delta && h.delta > 0 ? h.delta : 0),
    0,
  );
  const totalNegativeImpact = history.reduce(
    (sum: number, h: any) => sum + (h.delta && h.delta < 0 ? Math.abs(h.delta) : 0),
    0,
  );
  const credibilityTracker = calcProfileCredibility({
    baseCredibility: Math.min(account.profileCompletion ?? 80, 80),
    trustBadgeBonus: account.trustBadge ? 20 : 0,
    opposedPosts: account.opposedPosts ?? 0,
    disputeLosses: account.disputesLost ?? 0,
    aiFlaggedPosts: account.aiFlaggedPosts ?? 0,
  });

  return {
    history,
    delta,
    weeklyDelta,
    totalPositiveImpact,
    totalNegativeImpact,
    profileCredibility: credibilityTracker.updatedCredibility
  };
}

export function getCachedAccountById(id: string) {
  return cached(
    cacheKey('shosha', 'v1', 'profile', 'account', id),
    PROFILE_CACHE_TTL,
    () => accountsRepo.findById(id)
  );
}

/** Clear profile caches after score or dossier mutations (swipes, reports, admin edits). */
export async function invalidateProfileCaches(account: Pick<AccountRecord, '_id' | 'username'> & { slug?: string }) {
  const keys = [
    cacheKey('shosha', 'v1', 'profile', 'account', account._id),
    cacheKey('shosha', 'v1', 'profile', 'bundle', account._id),
    cacheKey('shosha', 'v1', 'profile', 'username', account.username.toLowerCase()),
  ];
  if (account.slug) {
    keys.push(cacheKey('shosha', 'v1', 'profile', 'slug', account.slug));
  }
  await Promise.all(keys.map((key) => invalidateCacheKey(key)));
}

export function getCachedAccountBySlug(slug: string) {
  return cached(
    cacheKey('shosha', 'v1', 'profile', 'slug', slug),
    PROFILE_CACHE_TTL,
    () => accountsRepo.findBySlug(slug)
  );
}

export function getCachedAccountByUsername(username: string) {
  return cached(
    cacheKey('shosha', 'v1', 'profile', 'username', username.toLowerCase()),
    PROFILE_CACHE_TTL,
    () => accountsRepo.findByUsername(username)
  );
}

export function getCachedProfileBundle(accountId: string) {
  return cached<ProfileBundle | null>(
    cacheKey('shosha', 'v1', 'profile', 'bundle', accountId),
    PROFILE_CACHE_TTL,
    async () => {
      const account = await accountsRepo.findById(accountId);
      if (!account) return null;

      const [filingsRaw, allTop] = await Promise.all([
        reportsRepo.listForAccount(account._id, ['approved', 'ai_reviewed', 'flagged'], 30),
        accountsRepo.listAll(120).catch(() => [])
      ]);

      // For website accounts, inject reporter filings from linked user
      let allFilings = filingsRaw;
      if (account.platform === 'website') {
        const linkedUser = account.claimedBy
          ? await usersRepo.findById(account.claimedBy).catch(() => null)
          : await usersRepo.findByUsername(account.username).catch(() => null);

        if (linkedUser) {
          const reporterFilings = await reportsRepo.listByReporter(linkedUser._id, 50)
            .catch(() => [] as typeof filingsRaw);

          // Merge and deduplicate by _id, reporter filings first
          const seen = new Set<string>();
          allFilings = [...reporterFilings, ...filingsRaw].filter((f) => {
            if (seen.has(f._id)) return false;
            seen.add(f._id);
            return true;
          });
        }
      }

      const reporterIds = Array.from(new Set(
        allFilings
          .filter((filing) => !hidesReporterOnPublicSurfaces(filing))
          .map((filing) => filing.reporterId)
          .filter(Boolean) as string[]
      ));
      const reporters = await Promise.all(reporterIds.map((id) => usersRepo.findById(id)));
      const similarProfiles = allTop
        .filter((candidate) => candidate._id !== account._id && candidate.platform === account.platform)
        .slice(0, 5);

      return {
        account: sanitizeBundleAccount(account),
        filingsRaw: allFilings,
        reporters: reporters.filter(Boolean).map((reporter) => summarizeReporter(reporter!)),
        similarProfiles,
        metrics: deriveProfileMetrics(account)
      };
    }
  );
}
