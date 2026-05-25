import Link from 'next/link';
import { 
  Gavel, 
  Users, 
  Database, 
  ClipboardList, 
  Search, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Activity,
  Zap,
  ShieldCheck,
  ShieldAlert as ShieldAlertIcon,
  Crown,
  Lock,
  Globe
} from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as auditsRepo from '@/lib/repos/auditRequests';
import { AdminDashboardChart } from '@/components/admin/AdminDashboardChart';
import { BASE_SCORE } from '@/lib/scoring';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= BASE_SCORE ? 'text-emerald-400' : score >= 0 ? 'text-amber-400' : 'text-red-400';
  return <span className={cn("font-mono font-black text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/5 shadow-inner", color)}>{score}</span>;
}

export default async function AdminPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    queue,
    accountsTracked,
    filingsTotal,
    filingsLast7,
    usersTotal,
    pendingClaims,
    pendingAudits,
    abuseReports,
    pendingTrustBadge,
    topAccounts,
  ] = await Promise.all([
    reportsRepo.listQueue({}, 10),
    accountsRepo.count(),
    reportsRepo.count(),
    reportsRepo.countSince(sevenDaysAgo),
    usersRepo.count(),
    claimsRepo.listPending(),
    auditsRepo.listPending(),
    reportsRepo.listAbuse(20),
    usersRepo.listTrustBadgePending().catch(() => []),
    accountsRepo.listTop(5),
  ]);

  const accountIds = Array.from(new Set(queue.map((r) => r.accountId)));
  const reporterIds = Array.from(new Set(queue.map((r) => r.reporterId).filter(Boolean) as string[]));

  const [accounts, reporters] = await Promise.all([
    Promise.all(accountIds.map((id) => accountsRepo.findById(id))),
    Promise.all(reporterIds.map((id) => usersRepo.findById(id))),
  ]);

  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));
  const reporterMap = new Map(reporters.filter(Boolean).map((u) => [u!._id, u!]));

  const queueRows = queue
    .map((r) => ({
      ...r,
      account: accountMap.get(r.accountId) ?? null,
      reporter: r.reporterId ? reporterMap.get(r.reporterId) ?? null : null,
    }))
    .filter((r) => r.account !== null)
    .slice(0, 5);

  const mainStats = [
    { label: 'Active Dossiers', value: accountsTracked, icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Citizen Registry', value: usersTotal, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Network Velocity', value: filingsLast7, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Global Filings', value: filingsTotal, icon: Globe, color: 'text-primary', bg: 'bg-primary/20' },
  ];

  return (
    <div className="space-y-12">
      {/* System Status Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Zap size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/70">System operational</span>
          </div>
          <h2 className="text-4xl font-serif font-black italic tracking-tight">Executive Summary</h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">Operational data for the last 24 hours.</p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Queue Load</span>
            <span className="text-2xl font-mono font-black text-foreground">{(queue.length / 100 * 100).toFixed(1)}%</span>
          </div>
          <div className="h-10 w-[1px] bg-white/5" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Confidence Avg</span>
            <span className="text-2xl font-mono font-black text-primary">88.4%</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:border-white/10">
              <div className={cn("absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-[0.05] transition-transform group-hover:scale-125", stat.bg)} />
              <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-6 shadow-2xl", stat.bg)}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-4xl font-mono font-black text-foreground tracking-tighter leading-none mb-2">{stat.value.toLocaleString()}</p>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2">
          <AdminDashboardChart />
        </div>
        <div className="space-y-6">
          <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 h-full flex flex-col justify-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-6">Network Health</h3>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Ingestion Latency</span>
                <span className="text-sm font-mono font-black text-emerald-500">142ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">API Integrity</span>
                <span className="text-sm font-mono font-black text-emerald-500">99.98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Storage Capacity</span>
                <span className="text-sm font-mono font-black text-primary">12.4 TB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Main Feed/Queue */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">Active Operation Queue</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Priority adjudication tasks</p>
              </div>
            </div>
            <Link href="/admin/queue" className="group flex items-center gap-2 text-[10px] font-black text-primary hover:opacity-80 transition-all uppercase tracking-widest">
              Full Spectrum <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid gap-4">
            {queueRows.length === 0 ? (
              <div className="rounded-[3rem] border border-dashed border-white/10 bg-white/[0.02] p-20 text-center">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-6 animate-pulse border border-emerald-500/20">
                  <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-black text-foreground italic">Backlog Cleared</h3>
                <p className="text-muted-foreground text-sm mt-3 max-w-xs mx-auto font-medium">All pending filings have been adjudicated. Monitoring for new incoming data streams.</p>
              </div>
            ) : (
              queueRows.map((report) => (
                <Link
                  key={report._id}
                  href={`/admin/review/${report._id}`}
                  className="group flex items-center gap-8 rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-primary/20 transition-all"
                >
                  <div className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] shadow-2xl border border-white/5 transition-transform group-hover:scale-105",
                    report.type === 'positive' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  )}>
                    {report.type === 'positive' ? <CheckCircle size={28} /> : <ShieldAlertIcon size={28} />}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <p className="text-foreground font-black text-xl truncate leading-none italic">
                          {report.reporter ? (report.reporter.name || report.reporter.username.replace(/^@/, '')) : 'System'}
                        </p>
                        <span className="text-muted-foreground/30 text-xs uppercase font-black tracking-tighter">on</span>
                        <p className="text-muted-foreground font-bold text-sm truncate leading-none">
                          {report.account?.displayName.replace(/^@/, '')}
                        </p>
                      </div>
                      {report.status === 'flagged' && (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <AlertTriangle size={10} /> Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
                      {report.description || 'System generated case file...'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 px-6 border-l border-white/5">
                    <p className={cn(
                      "text-3xl font-mono font-black leading-none",
                      report.aiVerdict?.proposedImpact && report.aiVerdict.proposedImpact > 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {(report.aiVerdict?.proposedImpact ?? 0) > 0 ? '+' : ''}{report.aiVerdict?.proposedImpact ?? 0}
                    </p>
                    <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-1">Delta</p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="rounded-[2.5rem] bg-primary/[0.03] border border-primary/20 p-8 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
              <ShieldCheck size={100} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={12} className="text-primary/60" />
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Security Audit Required</h3>
              </div>
              <p className="text-foreground font-black text-2xl italic tracking-tight">Manual Verification Pending</p>
              <p className="text-muted-foreground text-sm font-medium mt-1 opacity-70">{pendingAudits.length} cases require tribunal oversight for account verification.</p>
            </div>
            <Link href="/admin/audits" className="relative z-10 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 transition-all active:scale-95">
              Execute Audit
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          {/* Top Accounts */}
          <div className="rounded-[3rem] border border-white/5 bg-white/[0.02] p-10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Crown size={16} className="text-amber-500" />
                <h2 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em]">Registry Elite</h2>
              </div>
              <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center">
                <Zap size={12} className="text-amber-500/40" />
              </div>
            </div>
            <div className="space-y-8">
              {topAccounts.map((account, i) => (
                <div
                  key={account._id}
                  className="flex items-center gap-5 group"
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-foreground font-black text-sm group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/account/${account._id}`} className="text-base text-foreground font-black italic truncate group-hover:text-primary transition-colors hover:underline block">{account.displayName.replace(/^@/, '')}</Link>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <ScoreBadge score={account.score} />
                    <span className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest mt-1">Level</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Center */}
          <div className="rounded-[3rem] border border-white/5 bg-white/[0.02] p-10">
            <h2 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em] mb-10">Registry Health</h2>
            <div className="grid gap-3">
              {[
                { label: 'Pending Claims', count: pendingClaims.length, href: '/admin/claims', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { label: 'Security Audits', count: pendingAudits.length, href: '/admin/audits', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                { label: 'Abuse Flagged', count: abuseReports.length, href: '/admin/abuse', color: 'text-red-500', bg: 'bg-red-500/10' },
                { label: 'Trust Badge Review', count: pendingTrustBadge.length, href: '/admin/trust-badge', color: 'text-purple-500', bg: 'bg-purple-500/10' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl px-6 py-5 bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("h-2 w-2 rounded-full", item.bg.replace('/10', ''))} />
                    <span className="text-muted-foreground text-[11px] font-black group-hover:text-foreground transition-colors uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className={cn(
                    "flex items-center justify-center min-w-[32px] h-8 px-3 rounded-xl text-[11px] font-black shadow-inner border border-white/5",
                    item.bg,
                    item.color
                  )}>
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

