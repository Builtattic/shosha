import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { BASE_SCORE } from '@/lib/scoring';
import { PeopleSwipeDeck, type PeopleDeckItem } from '@/components/people/PeopleSwipeDeck';

export const dynamic = 'force-dynamic';

function reportDelta(report: reportsRepo.ReportRecord) {
  return report.adminDecision?.finalImpact ?? report.reportScore ?? report.baseScore ?? 0;
}

/** Derive category tags from available account fields */
function deriveCategories(account: accountsRepo.AccountRecord): string[] {
  const cats: string[] = [];

  // role or profileKind
  if (account.role && account.role !== 'Platform User') cats.push(account.role);

  // specializedField
  if (account.specializedFieldWorkbook) {
    cats.push(...account.specializedFieldWorkbook.split(/[,/]/).map((s) => s.trim()).filter(Boolean));
  }

  // education
  if (account.educationWorkbook) cats.push(account.educationWorkbook.trim());

  // management
  if (account.managementWorkbook && account.managementWorkbook !== 'No') {
    cats.push(account.managementWorkbook.trim());
  }

  // Deduplicate and limit
  return [...new Set(cats)].slice(0, 6);
}

export default async function PeoplePage() {
  const accounts = await accountsRepo.listTop(60).catch(() => []);
  const selected = accounts.filter((a) => !a.archived).slice(0, 20);

  // Fetch reports for all selected accounts in parallel
  const filings = await Promise.all(
    selected.map((account) =>
      reportsRepo.listForAccount(account._id, ['approved', 'ai_reviewed'], 8).catch(() => [])
    )
  );

  const items: PeopleDeckItem[] = selected.map((account, index) => ({
    id: account._id,
    name: account.displayName.replace(/^@/, ''),
    handle: account.username.replace(/^@/, ''),
    avatar:
      account.avatarUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.displayName || account.username)}`,
    platform: account.platform,
    role: account.role || account.profileKind || 'Public Figure',
    region: account.region || account.cityCountry || 'Global',
    score: account.displayScore ?? account.score ?? BASE_SCORE,
    weekDelta: account.windowScores?.w1Delta,
    followers: account.followers || '0',
    verified: Boolean(account.verified),
    profileKind: account.profileKind,
    bio: account.bio && account.bio !== 'Platform User' ? account.bio : undefined,
    categories: deriveCategories(account),
    followUserId: account.claimedBy ?? undefined,
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
