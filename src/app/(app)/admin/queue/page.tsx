import Link from 'next/link';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  Brain,
  History,
  Search,
  Filter,
  Layers
} from 'lucide-react';
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
    <div className="space-y-8 safe-bottom">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-primary" />
            <h2 className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.2em]">Operations Queue</h2>
          </div>
          <h1 className="text-3xl font-serif font-black text-foreground tracking-tight italic">Pending Adjudication</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Queue Load</p>
              <p className="text-xl font-mono font-black text-foreground leading-none">{rows.length}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">System Health</p>
              <p className="text-xl font-mono font-black text-emerald-500 leading-none">Optimal</p>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[3rem] border border-white/5 bg-white/[0.02] p-24 text-center backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative z-10">
            <div className="h-24 w-24 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/10">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-3xl font-serif font-black text-foreground mb-3">All Clear</h3>
            <p className="text-muted-foreground text-base max-w-sm mx-auto font-medium leading-relaxed">The tribunal has processed all outstanding filings. The ledger is up to date.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((report) => {
            const hasAbuse = (report.aiVerdict?.abuseFlags?.length ?? 0) > 0;
            const confidence = Math.round((report.aiVerdict?.confidence ?? 0) * 100);
            const isPositive = report.type === 'positive';
            
            return (
              <Link
                key={report._id}
                href={`/admin/review/${report._id}`}
                className="relative overflow-hidden group rounded-[2rem] border border-white/5 bg-white/[0.03] p-1 hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isPositive ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />

                  {/* Account Identity */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-14 w-14 rounded-2xl bg-secondary/50 border border-white/5 overflow-hidden flex-shrink-0">
                      {report.account?.avatarUrl ? (
                        <img src={report.account.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/20">
                          <ShieldCheck size={24} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-black text-foreground group-hover:text-primary transition-colors truncate">
                          {report.account?.displayName}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {report.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-tight">
                        <span className="truncate">{report.account?.username}</span>
                        <span>·</span>
                        <span className="capitalize">{report.account?.platform}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filing Content */}
                  <div className="flex-[1.5] min-w-0 md:px-6">
                    <p className="text-[13px] font-medium text-foreground/80 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {hasAbuse && (
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded bg-red-500/10 text-red-500 flex items-center gap-1">
                          <AlertTriangle size={8} /> abuse detection
                        </span>
                      )}
                      {report.status === 'pending_ai' && (
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded bg-amber-500/10 text-amber-500 flex items-center gap-1">
                          <Brain size={8} /> processing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI & Impact Stats */}
                  <div className="flex items-center gap-8 shrink-0 md:border-l md:border-white/5 md:pl-8">
                    <div className="text-center">
                      <div className="flex items-center gap-1.5 justify-center mb-1">
                        <Brain size={12} className="text-primary/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Confidence</span>
                      </div>
                      <div className="text-xl font-mono font-black text-foreground/80">{confidence}%</div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Impact</div>
                      <div className={`text-xl font-mono font-black ${
                        (report.aiVerdict?.proposedImpact ?? 0) > 0 ? 'text-emerald-500' : (report.aiVerdict?.proposedImpact ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground/30'
                      }`}>
                        {(report.aiVerdict?.proposedImpact ?? 0) > 0 ? '+' : ''}{report.aiVerdict?.proposedImpact ?? '—'}
                      </div>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Audit History link */}
      <div className="flex justify-center mt-12">
        <Link href="/admin/activity" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all">
          <History size={14} />
          View Complete Audit Log
        </Link>
      </div>
    </div>
  );
}
