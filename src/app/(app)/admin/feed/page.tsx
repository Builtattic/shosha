import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import { AdminFeedTable } from './AdminFeedTable';

export const dynamic = 'force-dynamic';

export default async function AdminFeedPage() {
  const reports = await reportsRepo.listAll(300);
  const accountIds = Array.from(new Set(reports.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const rows = reports.map((report) => ({ ...report, account: accountMap.get(report.accountId) ? { displayName: accountMap.get(report.accountId)!.displayName, username: accountMap.get(report.accountId)!.username, platform: accountMap.get(report.accountId)!.platform } : null }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Feed Control</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">{rows.length} latest reports</span>
      </div>
      <div className="rounded-3xl border border-border bg-card overflow-hidden"><AdminFeedTable initialReports={rows} /></div>
    </div>
  );
}
