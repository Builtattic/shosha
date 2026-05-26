import { ok } from '@/lib/api';
import { cached } from '@/lib/cache';
import { hidesReporterOnPublicSurfaces, redactPublicReporter } from '@/lib/reportPrivacy';
import * as accountsRepo from '@/lib/repos/accounts';
import type { ReportRecord } from '@/lib/repos/reports';
import * as reportsRepo from '@/lib/repos/reports';
import * as siteSettingsRepo from '@/lib/repos/siteSettings';
import * as usersRepo from '@/lib/repos/users';
import { MIN_TRENDING_ENGAGEMENT, socialFeedScore } from '@/lib/feedRanking';

const MIN_RECENT_ENGAGEMENT = 1;

type ReportStats = NonNullable<ReportRecord['stats']>;

function engagementTotal(stats?: ReportStats) {
  return (stats?.aligns ?? 0) + (stats?.opposes ?? 0) + (stats?.comments ?? 0) + (stats?.shares ?? 0);
}

function createdTime(report: { createdAt?: string }) {
  const time = report.createdAt ? new Date(report.createdAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

type EnrichedReport = ReportRecord & {
  account: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    platform?: string;
    verified?: boolean;
  };
  reporter?: {
    _id: string;
    username: string;
    name?: string;
    photoUrl?: string;
    role?: string;
  } | null;
};

async function loadEnrichedReports(): Promise<EnrichedReport[]> {
  const settings = await siteSettingsRepo.get();
  const reports = await reportsRepo.listPublicFeed(500, siteSettingsRepo.publicFeedStatuses(settings));
  const accountIds = Array.from(new Set(reports.map((report) => report.accountId)));
  const reporterIds = Array.from(
    new Set(
      reports
        .filter((report) => !hidesReporterOnPublicSurfaces(report))
        .map((report) => report.reporterId)
        .filter(Boolean),
    ),
  ) as string[];

  const [accounts, reporters] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(reporterIds.map((id) => usersRepo.findById(id))),
  ]);

  const accountMap = new Map(accounts.filter(Boolean).map((account) => [account!._id, account!]));
  const reporterMap = new Map(reporters.filter(Boolean).map((reporter) => [reporter!._id, reporter!]));

  return reports
    .map((report) => {
      const account = accountMap.get(report.accountId);
      if (!account) return null;

      const enriched = {
        ...report,
        account: {
          _id: account._id,
          displayName: account.displayName,
          username: account.username,
          avatarUrl: account.avatarUrl,
          platform: account.platform,
          verified: account.verified,
        },
        reporter:
          !hidesReporterOnPublicSurfaces(report) && report.reporterId
            ? reporterMap.get(report.reporterId) ?? null
            : null,
      } as EnrichedReport;

      return redactPublicReporter(enriched);
    })
    .filter((report): report is EnrichedReport => report !== null);
}

function pickTopStories(reports: EnrichedReport[]): EnrichedReport[] {
  return reports
    .filter((report) => engagementTotal(report.stats) >= MIN_TRENDING_ENGAGEMENT)
    .sort((a, b) => socialFeedScore(b as any) - socialFeedScore(a as any) || createdTime(b) - createdTime(a))
    .slice(0, 10);
}

function pickRecentReports(reports: EnrichedReport[]): EnrichedReport[] {
  return reports
    .filter((report) => engagementTotal(report.stats) >= MIN_RECENT_ENGAGEMENT)
    .sort((a, b) => createdTime(b) - createdTime(a))
    .slice(0, 10);
}

export async function GET() {
  const data = await cached('shosha:v1:impact:explore', 60, async () => {
    const reports = await loadEnrichedReports();
    return {
      topStories: pickTopStories(reports),
      recentReports: pickRecentReports(reports),
    };
  });

  return ok(data);
}
