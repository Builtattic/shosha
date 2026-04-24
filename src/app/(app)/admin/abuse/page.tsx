import { EmptyState } from '@/components/ui/EmptyState';
import { connectDb } from '@/lib/db';
import { serializeDoc } from '@/lib/utils';
import { Report } from '@/models/Report';

export const dynamic = 'force-dynamic';

export default async function AbusePage() {
  await connectDb();
  const reports = serializeDoc(
    await Report.find({ 'aiVerdict.abuseFlags.0': { $exists: true } }).populate('accountId').sort({ createdAt: -1 }).limit(100).lean()
  );
  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Tribunal</p>
      <h1 className="mt-2 font-serif text-6xl">Abuse</h1>
      <div className="mt-6 space-y-3">
        {reports.length ? (
          reports.map((report: any) => (
            <article key={report._id} className="border border-danger bg-raised p-4">
              <p className="text-xs uppercase text-danger">{report.aiVerdict?.abuseFlags?.join(', ')}</p>
              <h2 className="mt-2 font-serif text-3xl">{report.accountId?.displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>
            </article>
          ))
        ) : (
          <EmptyState title="No abuse signals." body="The flagged tray is empty." />
        )}
      </div>
    </main>
  );
}
