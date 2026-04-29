import Link from 'next/link';
import { Gavel, Users, Database, ClipboardList, Search, ShieldAlert, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';
import * as usersRepo from '@/lib/repos/users';
import * as claimsRepo from '@/lib/repos/claimRequests';
import * as auditsRepo from '@/lib/repos/auditRequests';
import { AdminDashboardChart } from '@/components/admin/AdminDashboardChart';

export const dynamic = 'force-dynamic';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
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
    { label: 'Accounts', value: accountsTracked, icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Users', value: usersTotal, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Filings (7d)', value: filingsLast7, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Filings', value: filingsTotal, icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Queue Depth', value: queueRows.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Claims', value: pendingClaims.length, icon: ClipboardList, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Audits', value: pendingAudits.length, icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Abuse Flags', value: abuseReports.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 font-bold mb-2">Tribunal</p>
        <h1 className="text-4xl font-black text-white tracking-tight">Command Center</h1>
        <p className="text-white/40 text-sm mt-1">Live platform overview and action queue</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-white/8 bg-white/4 p-4">
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} mb-3`}>
                <Icon size={15} className={stat.color} />
              </div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value.toLocaleString()}</p>
              <p className="text-white/40 text-xs font-medium mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">Review Queue</h2>
            <span className="text-xs text-white/30">{queueRows.length} pending</span>
          </div>
          <div className="space-y-2">
            {queueRows.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-white/4 p-8 text-center">
                <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-white/50 text-sm">Queue is clear.</p>
              </div>
            ) : (
              queueRows.map((report) => (
                <Link
                  key={report._id}
                  href={`/admin/review/${report._id}`}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 hover:bg-white/8 hover:border-white/15 transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        report.type === 'positive' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {report.type}
                      </span>
                      {report.status === 'flagged' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                          flagged
                        </span>
                      )}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{report.account?.displayName}</p>
                    <p className="text-white/40 text-xs truncate">{report.description}</p>
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <p className="text-white/20 text-xs font-mono group-hover:text-white/50 transition-colors">
                      AI: {report.aiVerdict?.proposedImpact ?? 0}
                    </p>
                    <p className="text-white/20 text-[10px] mt-0.5">{Math.round((report.aiVerdict?.confidence ?? 0) * 100)}%</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          {queueRows.length > 0 && (
            <Link href="/admin" className="block mt-3 text-center text-xs text-white/30 hover:text-white/60 transition-colors">
              View all in queue →
            </Link>
          )}
        </div>

        {/* Sidebar panels */}
        <div className="space-y-4">
          {/* Top Accounts */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Top Accounts</h2>
            <div className="space-y-2.5">
              {topAccounts.map((account, i) => (
                <Link
                  key={account._id}
                  href={`/admin/accounts`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <span className="text-white/20 text-xs font-mono w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{account.displayName}</p>
                    <p className="text-xs text-white/30 truncate">@{account.username} · {account.platform}</p>
                  </div>
                  <ScoreBadge score={account.score} />
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Pending Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Claims to review', count: pendingClaims.length, href: '/admin/claims', color: 'text-orange-400' },
                { label: 'Audits pending', count: pendingAudits.length, href: '/admin/audits', color: 'text-cyan-400' },
                { label: 'Abuse flags', count: abuseReports.length, href: '/admin/abuse', color: 'text-red-400' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <span className="text-white/50 text-sm">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Nav */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-4">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Manage</h2>
            <div className="space-y-1">
              {[
                { label: 'All Users', href: '/admin/users', icon: Users },
                { label: 'All Accounts', href: '/admin/accounts', icon: Database },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
