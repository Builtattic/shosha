import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as swipeRecordsRepo from '@/lib/repos/swipeRecords';
import { BASE_SCORE } from '@/lib/scoring';

function reportDelta(report: reportsRepo.ReportRecord) {
  return report.adminDecision?.finalImpact ?? report.reportScore ?? report.baseScore ?? 0;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to browse people.', 401);

  const url = new URL(request.url);
  const cursor = parseInt(url.searchParams.get('cursor') ?? '0', 10);
  const limit = 8;

  // Fetch accounts and user's existing swipes in parallel
  const [accounts, userSwipes] = await Promise.all([
    accountsRepo.listTop(60).catch(() => []),
    // Get the set of account IDs this user has already swiped on
    swipeRecordsRepo.listForUser(user._id).catch(() => [] as swipeRecordsRepo.SwipeRecord[]),
  ]);

  const swipedIds = new Set(userSwipes.map((s) => s.accountId));

  // Filter out archived, already-swiped, and self
  const eligible = accounts
    .filter((a) => !a.archived && !swipedIds.has(a._id))
    .slice(cursor, cursor + limit);

  const filings = await Promise.all(
    eligible.map((account) =>
      reportsRepo.listForAccount(account._id, ['approved', 'ai_reviewed'], 8).catch(() => [])
    )
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
    region: account.region || account.cityCountry || 'Global',
    score: account.displayScore ?? account.score ?? BASE_SCORE,
    followers: account.followers || '0',
    verified: Boolean(account.verified),
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
