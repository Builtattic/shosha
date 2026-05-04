import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatDate } from '@/lib/utils';

type Filing = {
  _id: string;
  type: 'positive' | 'negative';
  category?: string;
  deed?: string;
  baseScore?: number;
  reportScore?: number;
  description: string;
  feelings: string;
  anonymousTag: string;
  status: string;
  disputeStatus?: string;
  aiVerdict?: { proposedImpact: number; confidence: number; reasoning: string };
  adminDecision?: { finalImpact?: number };
  evidenceSourceUrl?: string;
  createdAt: string;
  reporter?: { name?: string; username: string };
};

function formatScore(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${value > 0 ? '+' : ''}${Number.isInteger(value) ? value : value.toFixed(1)}`;
}


export function FilingsList({ filings }: { filings: Filing[] }) {
  if (!filings.length) {
    return <EmptyState title="No filings on record." body="The dossier has a blank incident ledger." />;
  }

  return (
    <div className="space-y-3">
      {filings.map((filing) => {
        const visibleScore = formatScore(filing.reportScore ?? filing.adminDecision?.finalImpact ?? filing.aiVerdict?.proposedImpact);
        const baseScore = formatScore(filing.baseScore);
        const statusLabel = filing.status.replace(/_/g, ' ');
        const disputeLabel = filing.disputeStatus && filing.disputeStatus !== 'none'
          ? filing.disputeStatus.replace(/_/g, ' ')
          : null;
        const createdAt = formatDate(filing.createdAt);

        return (
          <article key={filing._id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Link 
                    href={filing.reporter && filing.reporter.username !== 'anonymous' ? `/account/website_${filing.reporter.username.replace(/^@/, '')}` : '#'}
                    className={cn(
                      "hover:text-foreground hover:underline",
                      (!filing.reporter || filing.reporter.username === 'anonymous') && "pointer-events-none opacity-70"
                    )}
                  >
                    {filing.reporter?.name || filing.reporter?.username.replace(/^@/, '') || filing.anonymousTag}
                  </Link>
                  {createdAt ? ` / ${createdAt}` : ''}
                </div>
                <div className="flex flex-wrap gap-2">
                  {filing.category ? (
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {filing.category}
                    </span>
                  ) : null}
                  {filing.deed ? (
                    <span className="max-w-full truncate rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {filing.deed}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                    filing.type === 'positive'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {filing.type}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {statusLabel}
                </span>
                {disputeLabel ? (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {disputeLabel}
                  </span>
                ) : null}
                {filing.evidenceSourceUrl ? (
                  <a
                    href={filing.evidenceSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                  >
                    View Source
                  </a>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-foreground">{filing.description}</p>
            {filing.feelings ? (
              <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                {filing.feelings}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
              <div className="rounded-xl bg-muted px-3 py-2">
                <span className="block font-semibold text-muted-foreground">Base</span>
                <span className={cn('font-bold', (filing.baseScore ?? 0) < 0 ? 'text-destructive' : 'text-primary')}>
                  {baseScore ?? 'Pending'}
                </span>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <span className="block font-semibold text-muted-foreground">Workbook score</span>
                <span className={cn('font-bold', (filing.reportScore ?? 0) < 0 ? 'text-destructive' : 'text-primary')}>
                  {visibleScore ?? 'Pending'}
                </span>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <span className="block font-semibold text-muted-foreground">AI confidence</span>
                <span className="font-bold text-foreground">
                  {filing.aiVerdict ? `${Math.round(filing.aiVerdict.confidence * 100)}%` : 'Pending'}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
