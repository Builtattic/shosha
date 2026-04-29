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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Review Queue</h2>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {rows.length} awaiting review
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">Queue is clear</h3>
          <p className="text-muted-foreground text-sm">All filings have been processed by the tribunal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((report) => {
            const hasAbuse = (report.aiVerdict?.abuseFlags?.length ?? 0) > 0;
            const confidence = Math.round((report.aiVerdict?.confidence ?? 0) * 100);
            return (
              <Link
                key={report._id}
                href={`/admin/review/${report._id}`}
                className="flex items-center gap-6 rounded-3xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                {/* Type indicator */}
                <div className={`w-1.5 self-stretch rounded-full shrink-0 ${
                  report.type === 'positive' ? 'bg-emerald-500' : 'bg-destructive'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      report.type === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {report.type}
                    </span>
                    {hasAbuse && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-100 text-red-700 flex items-center gap-1.5">
                        <AlertTriangle size={10} /> abuse
                      </span>
                    )}
                    {report.status === 'pending_ai' && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                        pending AI
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-black text-foreground group-hover:text-primary transition-colors">{report.account?.displayName}</p>
                  <p className="text-[13px] text-muted-foreground truncate mt-0.5">{report.description}</p>
                </div>

                {/* Meta */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className={`text-lg font-black font-mono ${
                    (report.aiVerdict?.proposedImpact ?? 0) > 0 ? 'text-emerald-600' : (report.aiVerdict?.proposedImpact ?? 0) < 0 ? 'text-destructive' : 'text-muted-foreground/30'
                  }`}>
                    {(report.aiVerdict?.proposedImpact ?? 0) > 0 ? '+' : ''}{report.aiVerdict?.proposedImpact ?? '—'}
                  </p>
                  <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-wider mt-0.5">{confidence}% confidence</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
