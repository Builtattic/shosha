import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Brain, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import AdminReviewControls from '@/components/admin/AdminReviewControls';
import { getReportForReview } from '@/api/admin';
import type { ReportOut } from '@/types/report';
import { cn } from '@/lib/utils';

function parseAiVerdict(report: ReportOut | null) {
  const v = report?.ai_verdict as Record<string, unknown> | null | undefined;
  return {
    proposedImpact: typeof v?.proposedImpact === 'number' ? v.proposedImpact : 0,
    confidence: typeof v?.confidence === 'number' ? v.confidence : null,
    reasoning: typeof v?.reasoning === 'string' ? v.reasoning : null,
    categoryTags: Array.isArray(v?.categoryTags)
      ? (v.categoryTags as string[])
      : [],
    abuseFlags: Array.isArray(v?.abuseFlags) ? (v.abuseFlags as string[]) : [],
  };
}

export default function AdminReview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReportForReview(reportId);
        if (mounted) setReport(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Report not found');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (error || !report) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
        <p className="font-bold text-destructive">{error ?? 'Report not found'}</p>
        <Link to="/admin/queue" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to queue
        </Link>
      </div>
    );
  }

  const ai = parseAiVerdict(report);
  const images = report.media_items.filter((m) => m.media_type === 'image');
  const reportType = report.type ?? 'positive';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/admin/queue"
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to operations queue
        </Link>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-[9px] font-black uppercase',
              reportType === 'positive'
                ? 'border-border bg-muted text-foreground'
                : 'border-destructive/20 bg-destructive/10 text-destructive',
            )}
          >
            {reportType} filing
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-[9px] font-black uppercase text-muted-foreground">
            {report.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck size={20} className="text-primary" />
              <div>
                <h1 className="text-2xl font-serif font-black italic">
                  {report.account?.display_name ?? report.account?.handle ?? 'Case File'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  @{report.account?.handle} · {report.account?.platform}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Score: {report.account?.score?.toLocaleString() ?? '—'}
            </p>
            {report.account && (
              <Link
                to={`/accounts/${report.account.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                Inspect dossier <ExternalLink size={12} />
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Filing Statement
              </h3>
            </div>
            <p className="text-lg font-medium italic">&ldquo;{report.description}&rdquo;</p>
            {report.title && (
              <p className="mt-2 text-sm font-bold text-foreground">{report.title}</p>
            )}
          </div>

          {report.evidence_source_url && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Evidence source</p>
              <a
                href={report.evidence_source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm text-primary hover:underline"
              >
                {report.evidence_source_url}
              </a>
            </div>
          )}

          {images.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Digital Evidence
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt="Evidence"
                    className="max-h-80 w-full rounded-xl border border-border object-contain"
                  />
                ))}
              </div>
            </div>
          )}

          {report.ai_verdict && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
                  System Analysis
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {ai.confidence != null && (
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-3xl font-mono font-black">
                      {Math.round(ai.confidence * 100)}%
                    </p>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Confidence</p>
                  </div>
                )}
                <div className="rounded-xl border border-border p-4 text-center">
                  <p
                    className={cn(
                      'text-3xl font-mono font-black',
                      ai.proposedImpact > 0
                        ? 'text-emerald-500'
                        : ai.proposedImpact < 0
                          ? 'text-destructive'
                          : '',
                    )}
                  >
                    {ai.proposedImpact > 0 ? '+' : ''}
                    {ai.proposedImpact}
                  </p>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Proposed Delta</p>
                </div>
              </div>
              {ai.reasoning && (
                <p className="rounded-xl border border-primary/10 bg-background/60 p-4 text-sm">
                  {ai.reasoning}
                </p>
              )}
              {ai.categoryTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {ai.categoryTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-xl border border-primary/10 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {ai.abuseFlags.length > 0 && (
                <div className="mt-4 border-t border-primary/10 pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-destructive" />
                    <span className="text-[10px] font-black uppercase text-destructive">Abuse Markers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ai.abuseFlags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1 text-[10px] font-black uppercase text-destructive"
                      >
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:w-full">
          <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-6">
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tribunal Action
            </h3>
            <AdminReviewControls
              reportId={report.id}
              proposedImpact={ai.proposedImpact}
              score={report.account?.score ?? 0}
              reportType={reportType}
              initialCategory={ai.categoryTags[0]}
              initialDeed={report.deed ?? undefined}
              initialBaseScore={report.base_score ?? undefined}
              onDecided={() => navigate('/admin/queue')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
