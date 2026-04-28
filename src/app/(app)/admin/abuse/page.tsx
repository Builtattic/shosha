import { EmptyState } from '@/components/ui/EmptyState';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

export default async function AbusePage() {
  const reports = await reportsRepo.listAll(500);
  const flagged = reports.filter((r) => (r.aiVerdict?.abuseFlags?.length ?? 0) > 0).slice(0, 100);
  const accountIds = Array.from(new Set(flagged.map((r) => r.accountId)));
  const accounts = await Promise.all(accountIds.map((id) => accountsRepo.findById(id)));
  const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!._id, a!]));

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Abuse</h1>
      <div className="mt-6 space-y-3">
        {flagged.length ? (
          flagged.map((report) => {
            const account = accountMap.get(report.accountId);
            return (
              <article key={report._id} className="border border-danger bg-raised p-4">
                <p className="text-xs uppercase text-danger">{report.aiVerdict?.abuseFlags?.join(', ')}</p>
                <h2 className="mt-2 font-serif text-3xl">{account?.displayName ?? 'Unknown'}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>
              </article>
            );
          })
        ) : (
          <EmptyState title="No abuse signals." body="The flagged tray is empty." />
        )}
      </div>
    </main>
  );
}
