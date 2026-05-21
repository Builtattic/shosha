import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRelativeTime } from '@/lib/utils';

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

function filingThumbUrl(filing: Filing): string | undefined {
  const media = (filing as Filing & { media?: { url?: string; thumbUrl?: string } }).media;
  return media?.thumbUrl || media?.url || undefined;
}

function formatImpact(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  const body = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${sign}${body}`;
}

export function FilingsList({ filings }: { filings: Filing[] }) {
  if (!filings.length) {
    return <EmptyState title="No filings on record." body="The dossier has a blank incident ledger." />;
  }

  return (
    <div>
      {filings.map((filing) => {
        const thumbUrl = filingThumbUrl(filing);
        const visibleScore =
          filing.reportScore ??
          filing.adminDecision?.finalImpact ??
          filing.aiVerdict?.proposedImpact ??
          filing.baseScore ??
          null;

        return (
          <Link
            key={filing._id}
            href={`/post/${filing._id}`}
            className="flex items-center gap-3 rounded-lg border-b border-border px-1 py-3 transition-colors last:border-0 hover:bg-muted/30"
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
                  filing.type === 'positive' ? 'bg-green-500' : 'bg-red-500',
                )}
              >
                {filing.type === 'positive' ? '+' : '−'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-snug text-foreground">
                {filing.deed || filing.description || 'Report'}
              </p>
              {filing.category ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {filing.category}
                </span>
              ) : null}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {filing.createdAt ? formatRelativeTime(filing.createdAt) : ''}
              </p>
            </div>

            <div
              className={cn(
                'shrink-0 text-[14px] font-bold',
                visibleScore !== null && visibleScore > 0
                  ? 'text-green-600'
                  : visibleScore !== null && visibleScore < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground',
              )}
            >
              {formatImpact(visibleScore)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
