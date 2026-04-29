import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brain, AlertTriangle, Tag, CheckCircle2 } from 'lucide-react';
import { AdminReviewControls } from '@/components/admin/AdminReviewControls';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-destructive';
  return (
    <div className="flex flex-col items-center">
      <span className={`text-4xl font-black font-mono ${color}`}>{pct}%</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">AI Confidence</span>
    </div>
  );
}

export default async function ReviewPage({ params }: { params: { reportId: string } }) {
  const id = idSchema.safeParse(params.reportId);
  if (!id.success) notFound();
  const report = await reportsRepo.findById(id.data);
  if (!report) notFound();
  const account = await accountsRepo.findById(report.accountId);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/queue" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft size={14} />
        Back to queue
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
              report.type === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {report.type} filing
            </span>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground border border-border">
              {report.status.replace('_', ' ')}
            </span>
            {(report.aiVerdict?.abuseFlags?.length ?? 0) > 0 && (
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-100 text-red-700 flex items-center gap-1.5">
                <AlertTriangle size={10} /> abuse
              </span>
            )}
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{account?.displayName ?? 'Case file'}</h1>
          {account && (
            <p className="text-muted-foreground text-sm font-medium mt-1">
              @{account.username} · {account.platform} · Trust Score: <span className="font-black text-foreground">{account.score}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Filing Description</h3>
            <p className="text-foreground leading-relaxed text-[15px] font-medium">{report.description}</p>
            {report.feelings && (
              <blockquote className="mt-6 border-l-4 border-primary/20 pl-6 text-sm text-muted-foreground italic leading-relaxed">
                &ldquo;{report.feelings}&rdquo;
              </blockquote>
            )}
          </div>

          {/* Media */}
          {report.media?.url && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Evidence</h3>
              <div className="rounded-2xl overflow-hidden bg-secondary border border-border">
                {report.media.type === 'video' ? (
                  <video src={report.media.url} className="w-full max-h-[400px] object-contain" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={report.media.url} alt="Evidence" className="w-full max-h-[400px] object-contain" />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* AI Verdict */}
          {report.aiVerdict && (
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain size={120} className="text-primary" />
              </div>
              
              <div className="flex items-center gap-2 mb-8 relative z-10">
                <Brain size={16} className="text-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">System Verdict</h3>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                <ConfidenceRing value={report.aiVerdict.confidence} />
                <div className="flex flex-col items-center">
                  <span className={`text-4xl font-black font-mono ${
                    report.aiVerdict.proposedImpact > 0 ? 'text-emerald-600' : report.aiVerdict.proposedImpact < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {report.aiVerdict.proposedImpact > 0 ? '+' : ''}{report.aiVerdict.proposedImpact}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Proposed Impact</span>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <p className="text-sm text-foreground/80 leading-relaxed font-medium bg-background/50 p-4 rounded-2xl border border-primary/10">
                  {report.aiVerdict.reasoning}
                </p>

                {report.aiVerdict.categoryTags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.aiVerdict.categoryTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/10 text-[11px] font-black text-primary uppercase">
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {(report.aiVerdict.abuseFlags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.aiVerdict.abuseFlags.map((flag) => (
                      <span key={flag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/10 text-[11px] font-black text-destructive uppercase">
                        <AlertTriangle size={10} />
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Controls */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-6">Tribunal Action</h3>
            <AdminReviewControls
              reportId={report._id}
              proposedImpact={report.aiVerdict?.proposedImpact ?? 0}
              score={account?.score ?? 60}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
