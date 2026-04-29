import { ShieldAlert } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { AbuseList } from './AbuseList';

export const dynamic = 'force-dynamic';

export default async function AbusePage() {
  const reports = await reportsRepo.listAll(500);
  const flagged = reports.filter((r) => (r.aiVerdict?.abuseFlags?.length ?? 0) > 0).slice(0, 100);
  const accountIds = Array.from(new Set(flagged.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

  const rows = flagged.map((report) => {
    const account = accountMap.get(report.accountId);
    return {
      _id: report._id,
      description: report.description,
      type: report.type,
      abuseFlags: report.aiVerdict?.abuseFlags ?? [],
      createdAt: report.createdAt,
      account: account
        ? { _id: account._id, displayName: account.displayName, platform: account.platform, username: account.username }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Abuse Oversight</h2>
        <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
          {rows.length} flagged filings
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <AbuseList initialReports={rows} />
      </div>
    </div>
  );
}
