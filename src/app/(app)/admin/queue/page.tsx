import Link from 'next/link';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

export default async function AdminQueuePage() {
  const [queue] = await Promise.all([reportsRepo.listQueue({}, 100)]);

  const accountIds = Array.from(new Set(queue.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

  const rows = queue
    .map((report) => ({ ...report, account: accountMap.get(report.accountId) ?? null }))
    .filter((row) => row.account !== null);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Queue</h1>
            <p className="text-white/40 text-sm mt-1">{rows.length} filing{rows.length !== 1 ? 's' : ''} awaiting review</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock size={20} className="text-amber-400" />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/4 p-16 text-center">
          <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm font-medium">Queue is clear.</p>
          <p className="text-white/25 text-xs mt-1">No filings awaiting tribunal review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((report) => {
            const hasAbuse = (report.aiVerdict?.abuseFlags?.length ?? 0) > 0;
            const confidence = Math.round((report.aiVerdict?.confidence ?? 0) * 100);
            return (
              <Link
                key={report._id}
                href={`/admin/review/${report._id}`}
                className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 px-5 py-4 hover:bg-white/7 hover:border-white/14 transition-all group"
              >
                {/* Type indicator */}
                <div className={`w-1 self-stretch rounded-full shrink-0 ${
                  report.type === 'positive' ? 'bg-emerald-500/50' : 'bg-red-500/50'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      report.type === 'positive' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {report.type}
                    </span>
                    {hasAbuse && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 flex items-center gap-1">
                        <AlertTriangle size={8} /> abuse
                      </span>
                    )}
                    {report.status === 'pending_ai' && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                        pending AI
                      </span>
                    )}
                  </div>
                  <p className="text-white font-semibold truncate">{report.account?.displayName}</p>
                  <p className="text-white/35 text-xs truncate">{report.description}</p>
                </div>

                {/* Meta */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className={`text-sm font-black font-mono ${
                    (report.aiVerdict?.proposedImpact ?? 0) > 0 ? 'text-emerald-400' : (report.aiVerdict?.proposedImpact ?? 0) < 0 ? 'text-red-400' : 'text-white/30'
                  }`}>
                    {(report.aiVerdict?.proposedImpact ?? 0) > 0 ? '+' : ''}{report.aiVerdict?.proposedImpact ?? '—'}
                  </p>
                  <p className="text-white/25 text-[10px] font-mono">{confidence}% conf</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
