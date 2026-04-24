import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsBars } from '@/components/admin/StatsBars';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { Account } from '@/models/Account';
import { Report } from '@/models/Report';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await connectDb();
  const [queue, accountsTracked, filingsTotal, filingsLast7] = await Promise.all([
    Report.find({ status: { $in: ['ai_reviewed', 'pending_ai', 'flagged'] } })
      .populate('accountId')
      .sort({ createdAt: 1 })
      .limit(50)
      .lean(),
    Account.countDocuments({}),
    Report.countDocuments({}),
    Report.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
  ]);
  const queueRows = serializeDoc(queue);
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
          queueRows.map((report: any) => (
            <Link key={report._id} href={`/admin/review/${report._id}`} className="block border border-border bg-raised p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted">{report.type}</p>
                <p className="text-xs uppercase text-accent">{report.aiVerdict?.proposedImpact ?? 0}</p>
              </div>
              <h2 className="mt-2 font-serif text-3xl">{report.accountId?.displayName ?? 'Unknown account'}</h2>
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
