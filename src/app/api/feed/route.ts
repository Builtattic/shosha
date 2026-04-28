import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as interactionsRepo from '@/lib/repos/reportInteractions';

function scoreReport(report: reportsRepo.ReportRecord) {
  const impact = Math.abs(report.adminDecision?.finalImpact ?? report.aiVerdict?.proposedImpact ?? 0);
  const stats = report.stats ?? { aligns: 0, opposes: 0, comments: 0, shares: 0 };
  return impact * 100 + stats.aligns + stats.opposes + stats.comments * 2 + stats.shares * 3;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'for_you';
  const user = await getCurrentUser();

  const reports = await reportsRepo.listPublicFeed(75);
  const accountIds = Array.from(new Set(reports.map((report) => report.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((account) => [account!._id, account!]));

  let feed = reports
    .map((report) => ({ ...report, account: accountMap.get(report.accountId) ?? null }))
    .filter((report) => report.account !== null);

  if (filter === 'following') {
    const followed = new Set(user?.claimedAccounts ?? []);
    feed = feed.filter((report) => followed.has(report.accountId));
  }

  if (filter === 'top') {
    feed = feed.sort((a, b) => scoreReport(b) - scoreReport(a));
  }

  if (filter === 'near') {
    feed = feed.filter((report) => report.account?.platform === 'instagram');
  }

  const viewerStates = await Promise.all(
    feed.map((report) => interactionsRepo.getViewerState(report._id, user?._id))
  );

  return ok(
    feed.slice(0, 30).map((report, index) => ({
      ...report,
      viewer: viewerStates[index]
    }))
  );
}
