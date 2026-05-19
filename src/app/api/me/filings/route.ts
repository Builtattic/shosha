import { ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { cached } from '@/lib/cache';
import * as accountsRepo from '@/lib/repos/accounts';
import type { ReportRecord } from '@/lib/repos/reports';
import * as reportsRepo from '@/lib/repos/reports';

const EMPTY = { filings: [] as MeFiling[], history: [] as NonNullable<accountsRepo.AccountRecord['scoreHistory']> };

type MeFiling = {
  id: string;
  title: string;
  category: string;
  delta: number;
  type: 'positive' | 'negative';
  status?: string;
  createdAt?: string;
  mediaUrl?: string;
  thumbUrl?: string;
  evidenceSourceUrl?: string;
};

function mapFiling(filing: ReportRecord): MeFiling {
  const score =
    filing.adminDecision?.finalImpact ??
    filing.aiVerdict?.proposedImpact ??
    filing.reportScore ??
    filing.baseScore ??
    0;
  return {
    id: filing._id,
    title: filing.deed || filing.description || 'Filing recorded',
    category: filing.category || 'Uncategorized',
    delta: score,
    type: filing.type,
    status: filing.status,
    createdAt: filing.createdAt,
    mediaUrl: filing.media?.url,
    thumbUrl: filing.media?.thumbUrl,
    evidenceSourceUrl: filing.evidenceSourceUrl,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !(user.claimedAccounts ?? []).length) {
      return ok(EMPTY);
    }

    const data = await cached(`shosha:v1:me:filings:${user._id}`, 30, async () => {
      const claimedAccountsRaw = await Promise.all(
        (user.claimedAccounts ?? []).slice(0, 10).map((id) => accountsRepo.findById(id)),
      );
      const claimedAccounts = claimedAccountsRaw.filter(Boolean);
      // Matches liveScoreAccount selection in GET /api/me
      const account =
        claimedAccounts.find((a) => a!.platform === 'website' && a!.claimedBy === user._id) ??
        claimedAccounts.find((a) => a!.claimedBy === user._id) ??
        claimedAccounts[0] ??
        null;

      if (!account) return EMPTY;

      const filingsRaw = await reportsRepo.listForAccount(
        account._id,
        ['approved', 'ai_reviewed', 'flagged'],
        50,
      );

      return {
        filings: filingsRaw.map(mapFiling),
        history: account.scoreHistory ?? [],
      };
    });

    return ok(data);
  } catch (err) {
    console.error('[GET /api/me/filings]', err);
    return ok(EMPTY);
  }
}
