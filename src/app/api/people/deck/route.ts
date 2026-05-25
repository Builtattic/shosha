import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as swipeRecordsRepo from '@/lib/repos/swipeRecords';
import { BASE_SCORE } from '@/lib/scoring';

function reportDelta(report: reportsRepo.ReportRecord) {
  return report.adminDecision?.finalImpact ?? report.reportScore ?? report.baseScore ?? 0;
}

/** Reach chip label → exact `account.reach` values seen in Firebase */
const REACH_BUCKETS: Record<string, string[]> = {
  '10K-1M+': ['10K-1M', '1M-10M', '10M-100M', '100M+'],
  '1M+': ['1M-10M', '10M-100M', '100M+'],
  '10M+': ['10M-100M', '100M+'],
  '100M+': ['100M+'],
};

function deriveCategories(account: accountsRepo.AccountRecord): string[] {
  const cats: string[] = [];
  if (account.role && account.role !== 'Platform User') cats.push(account.role);
  if (account.specializedFieldWorkbook) {
    cats.push(...account.specializedFieldWorkbook.split(/[,/]/).map((s) => s.trim()).filter(Boolean));
  }
  if (account.educationWorkbook) cats.push(account.educationWorkbook.trim());
  if (account.managementWorkbook && account.managementWorkbook !== 'No') {
    cats.push(account.managementWorkbook.trim());
  }
  return [...new Set(cats)].slice(0, 6);
}

function ageFromDob(dob: string | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

function accountAge(a: accountsRepo.AccountRecord): number | null {
  if (typeof a.age === 'number' && !Number.isNaN(a.age)) return a.age;
  return ageFromDob(a.dob);
}

function applyDeckFilters(
  eligible: accountsRepo.AccountRecord[],
  opts: {
    region: string | null;
    role: string | null;
    reach: string | null;
    ageBand: string | null;
    scoreFilter: string | null;
    category: string | null;
    legacyFilter: string | null;
  },
): accountsRepo.AccountRecord[] {
  let out = eligible;

  const region = opts.region;
  if (region && region !== 'Global') {
    const r = region.toLowerCase();
    out = out.filter((a) => {
      const reg = (a.region || '').toLowerCase();
      const city = (a.cityCountry || '').toLowerCase();
      return reg.includes(r) || city.includes(r);
    });
  }

  const role = opts.role;
  if (role && role !== 'All Roles') {
    const q = role.toLowerCase();
    out = out.filter((a) => {
      const pk = (a.profileKind ?? '').toLowerCase();
      const r = (a.role ?? '').toLowerCase();
      return pk.includes(q) || r.includes(q);
    });
  }

  const reach = opts.reach;
  if (reach && reach !== 'All') {
    const allowed = REACH_BUCKETS[reach];
    if (allowed) {
      const set = new Set(allowed);
      out = out.filter((a) => {
        const v = (a.reach || '').trim();
        if (v && set.has(v)) return true;
        // Fallback when `reach` string missing: approximate 10K-1M+ via followers
        if (reach === '10K-1M+' && !v) {
          if (!a.followers) return false;
          const f = parseInt(String(a.followers).replace(/[^0-9]/g, ''), 10);
          return !Number.isNaN(f) && f >= 10_000;
        }
        return false;
      });
    }
  }

  if (opts.ageBand === '18-65') {
    out = out.filter((a) => {
      const ag = accountAge(a);
      if (ag === null) return true;
      return ag >= 18 && ag <= 65;
    });
  }

  const category = opts.category;
  if (category && category !== 'Any') {
    const q = category.toLowerCase();
    out = out.filter((a) =>
      deriveCategories(a).some((c) => c.toLowerCase().includes(q)),
    );
  }

  const scoreFilter = opts.scoreFilter;
  if (scoreFilter === 'trending') {
    out = out.filter((a) => (a.score ?? 1000) > 1000);
  }
  if (scoreFilter === 'underfire') {
    out = out.filter((a) => (a.score ?? 1000) < 1000);
  }
  if (scoreFilter === 'elite') {
    out = out.filter((a) => (a.score ?? 1000) >= 1100);
  }

  // Legacy single `filter` param (backward compatible)
  const f = opts.legacyFilter;
  if (f && f !== 'Global' && f !== 'All') {
    if (f === '18-65+') {
      out = out.filter((a) => {
        const ag = accountAge(a);
        if (ag === null) return true;
        return ag >= 18 && ag <= 65;
      });
    } else if (f === 'All Roles') {
      // no-op
    } else if (f === '10K-1M+') {
      const allowed = REACH_BUCKETS['10K-1M+'] ?? [];
      const set = new Set(allowed);
      out = out.filter((a) => {
        const v = (a.reach || '').trim();
        if (v && set.has(v)) return true;
        if (!a.followers) return false;
        const n = parseInt(String(a.followers).replace(/[^0-9]/g, ''), 10);
        return !Number.isNaN(n) && n >= 10_000;
      });
    }
  }

  return out;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to browse people.', 401);

  const url = new URL(request.url);
  const cursor = parseInt(url.searchParams.get('cursor') ?? '0', 10);
  const limit = 8;

  const SWIPE_COOLDOWN_DAYS = 7;

  const [accounts, userSwipes] = await Promise.all([
    accountsRepo.listTop(60).catch(() => []),
    swipeRecordsRepo.listForUser(user._id).catch(() => [] as swipeRecordsRepo.SwipeRecord[]),
  ]);

  // Only exclude profiles swiped within the cooldown window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SWIPE_COOLDOWN_DAYS);
  const cutoffISO = cutoff.toISOString();

  const recentlySwipedIds = new Set(
    userSwipes
      .filter((s) => s.updatedAt > cutoffISO)
      .map((s) => s.accountId),
  );

  let eligible = accounts.filter((a) => !a.archived && !recentlySwipedIds.has(a._id));

  const region = url.searchParams.get('region');
  const role = url.searchParams.get('role');
  const reach = url.searchParams.get('reach');
  const ageBand = url.searchParams.get('ageBand');
  const scoreFilter = url.searchParams.get('scoreFilter');
  const category = url.searchParams.get('category');
  const legacyFilter = url.searchParams.get('filter');

  const hasStructured = Boolean(region || role || reach || ageBand || scoreFilter || category);
  if (hasStructured) {
    eligible = applyDeckFilters(eligible, {
      region,
      role,
      reach,
      ageBand,
      scoreFilter,
      category,
      legacyFilter: null,
    });
  } else if (legacyFilter) {
    eligible = applyDeckFilters(eligible, {
      region: null,
      role: null,
      reach: null,
      ageBand: null,
      scoreFilter: null,
      category: null,
      legacyFilter,
    });
  }

  eligible = eligible.slice(cursor, cursor + limit);

  const filings = await Promise.all(
    eligible.map((account) =>
      reportsRepo.listForAccount(account._id, ['approved', 'ai_reviewed'], 8).catch(() => []),
    ),
  );

  const items = eligible.map((account, i) => ({
    id: account._id,
    name: account.displayName.replace(/^@/, ''),
    handle: account.username.replace(/^@/, ''),
    avatar:
      account.avatarUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.displayName || account.username)}`,
    platform: account.platform,
    role: account.role || account.profileKind || 'Public Profile',
    profileKind: account.profileKind,
    region: account.region || account.cityCountry || 'Global',
    score: account.displayScore ?? account.score ?? BASE_SCORE,
    weekDelta: account.windowScores?.w1Delta ?? undefined,
    followers: account.followers || '0',
    verified: Boolean(account.verified),
    bio: account.bio && account.bio !== 'Platform User' ? account.bio : undefined,
    categories: deriveCategories(account),
    followUserId: account.claimedBy ?? undefined,
    topReports: filings[i]
      .map((r) => ({
        title: r.deed || r.description || 'Report recorded',
        delta: reportDelta(r),
        type: r.type,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4),
  }));

  return ok({ items, nextCursor: cursor + limit, hasMore: items.length === limit });
}
