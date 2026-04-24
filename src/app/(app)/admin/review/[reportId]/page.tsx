import { notFound } from 'next/navigation';
import { AdminReviewControls } from '@/components/admin/AdminReviewControls';
import { connectDb } from '@/lib/db';
import { objectIdSchema } from '@/lib/validators';
import { serializeDoc } from '@/lib/utils';
import { Report } from '@/models/Report';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: { reportId: string } }) {
  const id = objectIdSchema.safeParse(params.reportId);
  if (!id.success) notFound();
  await connectDb();
  const report: any = serializeDoc(await Report.findById(id.data).populate('accountId').lean());
  if (!report) notFound();
  const account = report.accountId;

  return (
    <main className="px-4 py-6">
      <p className="text-xs uppercase text-accent">Review screen</p>
      <h1 className="mt-2 font-serif text-5xl">{account?.displayName ?? 'Case file'}</h1>
      <section className="mt-6 border border-border bg-raised p-4">
        <p className="text-xs uppercase text-muted">{report.type} filing</p>
        <p className="mt-3 text-sm leading-6">{report.description}</p>
        <p className="mt-3 border-l border-border pl-3 text-xs leading-5 text-muted">{report.feelings}</p>
        {report.media?.type === 'video' ? (
          <video src={report.media.url} className="mt-4 max-h-72 w-full object-contain" controls />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.media?.url} alt="Evidence" className="mt-4 max-h-72 w-full object-contain" />
        )}
      </section>
      <section className="mt-4 border border-border bg-dim p-4">
        <p className="text-xs uppercase text-muted">AI verdict</p>
        <p className="mt-2 font-serif text-4xl">{report.aiVerdict?.valid ? 'Valid' : 'Flagged'}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{report.aiVerdict?.reasoning ?? 'No reasoning recorded.'}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs uppercase">
          <span>Confidence {Math.round((report.aiVerdict?.confidence ?? 0) * 100)}%</span>
          <span>Impact {report.aiVerdict?.proposedImpact ?? 0}</span>
        </div>
      </section>
      <section className="mt-4">
        <AdminReviewControls
          reportId={String(report._id)}
          proposedImpact={report.aiVerdict?.proposedImpact ?? 0}
          score={account?.score ?? 60}
        />
      </section>
    </main>
  );
}
