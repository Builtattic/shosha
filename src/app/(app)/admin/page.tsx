import Link from 'next/link';
import { Gavel, Users, Database, ClipboardList, Search, ShieldAlert, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as auditsRepo from '@/lib/repos/auditRequests';
import { AdminDashboardChart } from '@/components/admin/AdminDashboardChart';
import { BASE_SCORE } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= BASE_SCORE ? 'text-emerald-400' : score >= 0 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-mono font-bold ${color}`}>{score}</span>;
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
    accountsRepo.listTop(5),
  ]);

  const accountIds = Array.from(new Set(queue.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

  const queueRows = queue
    .map((r) => ({ ...r, account: accountMap.get(r.accountId) ?? null }))
    .filter((r) => r.account !== null)
    .slice(0, 8);

  const stats = [
    { label: 'Accounts', value: accountsTracked, icon: Database, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Users', value: usersTotal, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Filings (7d)', value: filingsLast7, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Total Filings', value: filingsTotal, icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Queue Depth', value: queueRows.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Claims', value: pendingClaims.length, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Audits', value: pendingAudits.length, icon: Search, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'Abuse Flags', value: abuseReports.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-sm">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} mb-4`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-3xl font-black text-foreground">{stat.value.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-black text-foreground uppercase tracking-[0.1em]">Recent Review Queue</h2>
            <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">{queueRows.length} items</span>
          </div>
          <div className="space-y-3">
            {queueRows.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-12 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                  <CheckCircle size={24} />
                </div>
                <p className="text-foreground font-bold">Queue is clear.</p>
                <p className="text-muted-foreground text-sm mt-1">No reports pending immediate review.</p>
              </div>
            ) : (
              queueRows.map((report) => (
                <Link
                  key={report._id}
                  href={`/admin/review/${report._id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                        report.type === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {report.type}
                      </span>
                      {report.status === 'flagged' && (
                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-amber-100 text-amber-700">
                          flagged
                        </span>
                      )}
                    </div>
                    <p className="text-foreground font-bold text-[16px] truncate">{report.account?.displayName}</p>
                    <p className="text-muted-foreground text-sm truncate mt-0.5">{report.description}</p>
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <div className="bg-secondary rounded-lg px-3 py-1.5 text-center">
                      <p className="text-foreground text-xs font-black">
                        {report.aiVerdict?.proposedImpact ?? 0}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-0.5">Impact</p>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter">
                      AI Conf: {Math.round((report.aiVerdict?.confidence ?? 0) * 100)}%
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
          {queueRows.length > 0 && (
            <Link href="/admin/queue" className="block text-center text-[13px] font-bold text-primary hover:underline py-2">
              View full moderation queue →
            </Link>
          )}
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Top Accounts */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-[12px] font-black text-foreground uppercase tracking-[0.1em] mb-5">Top Impact Accounts</h2>
            <div className="space-y-5">
              {topAccounts.map((account, i) => (
                <Link
                  key={account._id}
                  href={`/admin/accounts`}
                  className="flex items-center gap-4 group"
                >
                  <span className="text-muted-foreground text-[11px] font-black w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-bold truncate group-hover:text-primary transition-colors">{account.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">@{account.username} · {account.platform}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <ScoreBadge score={account.score} />
                    <span className="text-[9px] text-muted-foreground font-black uppercase">Score</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-[12px] font-black text-foreground uppercase tracking-[0.1em] mb-5">Critical Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Claims to review', count: pendingClaims.length, href: '/admin/claims', color: 'text-orange-600', bg: 'bg-orange-100' },
                { label: 'Audits pending', count: pendingAudits.length, href: '/admin/audits', color: 'text-cyan-600', bg: 'bg-cyan-100' },
                { label: 'Abuse flags', count: abuseReports.length, href: '/admin/abuse', color: 'text-red-600', bg: 'bg-red-100' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary transition-colors group"
                >
                  <span className="text-muted-foreground text-sm font-bold group-hover:text-foreground">{item.label}</span>
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-black ${item.bg} ${item.color}`}>
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
