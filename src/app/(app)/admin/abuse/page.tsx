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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Abuse</h1>
            <p className="text-white/40 text-sm mt-1">{rows.length} flagged report{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <ShieldAlert size={20} className="text-red-400" />
          </div>
        </div>
      </div>
      <AbuseList initialReports={rows} />
    </div>
  );
}
