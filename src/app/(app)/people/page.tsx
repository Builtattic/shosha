import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { BASE_SCORE } from '@/lib/scoring';
import { PeopleSwipeDeck, type PeopleDeckItem } from '@/components/people/PeopleSwipeDeck';

export const dynamic = 'force-dynamic';

function reportDelta(report: reportsRepo.ReportRecord) {
  return report.adminDecision?.finalImpact ?? report.reportScore ?? report.baseScore ?? 0;
}

export default async function PeoplePage() {
  const accounts = await accountsRepo.listTop(30).catch(() => []);
  const selected = accounts.filter((account) => !account.archived).slice(0, 12);
  const filings = await Promise.all(
    selected.map((account) => reportsRepo.listForAccount(account._id, ['approved', 'ai_reviewed'], 8).catch(() => []))
  );

  const items: PeopleDeckItem[] = selected.map((account, index) => ({
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
    topReports: filings[index]
      .map((report) => ({
        title: report.deed || report.description || 'Report recorded',
        delta: reportDelta(report),
        type: report.type,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4),
  }));

  return <PeopleSwipeDeck initialItems={items} />;
}
