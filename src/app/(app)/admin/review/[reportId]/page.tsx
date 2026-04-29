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
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex flex-col items-center">
      <span className={`text-3xl font-black font-mono ${color}`}>{pct}%</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-0.5">Confidence</span>
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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-6">
        <ArrowLeft size={15} />
        Back to queue
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
            report.type === 'positive' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'
          }`}>
            {report.type} filing
          </span>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/8 text-white/40 border border-white/10">
            {report.status.replace('_', ' ')}
          </span>
          {(report.aiVerdict?.abuseFlags?.length ?? 0) > 0 && (
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-1">
              <AlertTriangle size={9} /> abuse
            </span>
          )}
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">{account?.displayName ?? 'Case file'}</h1>
        {account && (
          <p className="text-white/40 text-sm mt-1">@{account.username} · {account.platform} · Score: <span className="font-mono text-white/60">{account.score}</span></p>
        )}
      </div>

      <div className="space-y-4">
        {/* Description */}
        <div className="rounded-xl border border-white/8 bg-white/4 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Filing Description</p>
          <p className="text-white/80 leading-relaxed text-sm">{report.description}</p>
          {report.feelings && (
            <blockquote className="mt-4 border-l-2 border-white/15 pl-4 text-xs text-white/40 leading-relaxed italic">
              {report.feelings}
            </blockquote>
          )}
        </div>

        {/* Media */}
        {report.media?.url && (
          <div className="rounded-xl border border-white/8 bg-white/4 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Evidence</p>
            {report.media.type === 'video' ? (
              <video src={report.media.url} className="w-full max-h-80 rounded-lg object-contain bg-black" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={report.media.url} alt="Evidence" className="w-full max-h-80 rounded-lg object-contain bg-black" />
            )}
          </div>
        )}

        {/* AI Verdict */}
        {report.aiVerdict && (
          <div className="rounded-xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={15} className="text-purple-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">AI Verdict</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <ConfidenceRing value={report.aiVerdict.confidence} />
              <div className="flex flex-col items-center">
                <span className={`text-3xl font-black font-mono ${
                  report.aiVerdict.proposedImpact > 0 ? 'text-emerald-400' : report.aiVerdict.proposedImpact < 0 ? 'text-red-400' : 'text-white/40'
                }`}>
                  {report.aiVerdict.proposedImpact > 0 ? '+' : ''}{report.aiVerdict.proposedImpact}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-0.5">Proposed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  report.aiVerdict.valid ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  <CheckCircle2 size={18} className={report.aiVerdict.valid ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1.5">
                  {report.aiVerdict.valid ? 'Valid' : 'Flagged'}
                </span>
              </div>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">{report.aiVerdict.reasoning}</p>
            {report.aiVerdict.categoryTags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {report.aiVerdict.categoryTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400">
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {(report.aiVerdict.abuseFlags?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.aiVerdict.abuseFlags.map((flag) => (
                  <span key={flag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-[10px] font-bold text-red-400">
                    <AlertTriangle size={8} />
                    {flag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Controls */}
        <AdminReviewControls
          reportId={report._id}
          proposedImpact={report.aiVerdict?.proposedImpact ?? 0}
          score={account?.score ?? 60}
        />
      </div>
    </div>
  );
}
