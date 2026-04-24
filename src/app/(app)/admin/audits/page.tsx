import { EmptyState } from '@/components/ui/EmptyState';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { AuditRequest } from '@/models/AuditRequest';

export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  await connectDb();
  const audits = serializeDoc(
    await AuditRequest.find({ status: { $in: ['pending', 'in_progress'] } }).populate('accountId').populate('userId', 'username').sort({ createdAt: 1 }).lean()
  );
  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Audits</h1>
      <div className="mt-6 space-y-3">
        {audits.length ? (
          audits.map((audit: any) => (
            <article key={audit._id} className="border border-border bg-raised p-4">
              <p className="text-xs uppercase text-muted">{audit.status}</p>
              <h2 className="mt-2 font-serif text-3xl">{audit.accountId?.displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{audit.reason || 'No reason recorded.'}</p>
            </article>
          ))
        ) : (
          <EmptyState title="No audits waiting." body="No owner has asked the tribunal to reopen the score." />
        )}
      </div>
    </main>
  );
}
