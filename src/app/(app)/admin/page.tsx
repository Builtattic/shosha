import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsBars } from '@/components/admin/StatsBars';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [queue, accountsTracked, filingsTotal, filingsLast7] = await Promise.all([
    reportsRepo.listQueue({}, 50),
    accountsRepo.count(),
    reportsRepo.count(),
    reportsRepo.countSince(sevenDaysAgo)
  ]);

  const accountIds = Array.from(new Set(queue.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

  const queueRows = queue
    .map((report) => ({ ...report, account: accountMap.get(report.accountId) ?? null }))
    .filter((row) => row.account !== null);
  const stats = { accountsTracked, filingsTotal, filingsLast7, queueDepth: queueRows.length };

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Queue</h1>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Link href="/admin/claims" className="border border-border p-3 text-center text-xs uppercase text-muted">
          Claims
        </Link>
        <Link href="/admin/audits" className="border border-border p-3 text-center text-xs uppercase text-muted">
          Audits
        </Link>
        <Link href="/admin/abuse" className="border border-border p-3 text-center text-xs uppercase text-muted">
          Abuse
        </Link>
      </div>
      <section className="mt-6 border border-border bg-raised p-3">
        <StatsBars stats={stats} />
      </section>
      <section className="mt-6 space-y-3">
        {queueRows.length ? (
          queueRows.map((report) => (
            <Link
              key={report._id}
              href={`/admin/review/${report._id}`}
              className="block border border-border bg-raised p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted">{report.type}</p>
                <p className="text-xs uppercase text-accent">{report.aiVerdict?.proposedImpact ?? 0}</p>
              </div>
              <h2 className="mt-2 font-serif text-3xl">{report.account?.displayName ?? 'Unknown account'}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{report.description}</p>
            </Link>
          ))
        ) : (
          <EmptyState title="No cases waiting." body="The tribunal table is clear." />
        )}
      </section>
    </main>
  );
}
