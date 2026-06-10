import { Link } from 'react-router-dom';
import type { MeFiling } from '@/api/me';
import { cn, formatRelativeTime } from '@/lib/utils';

interface FilingsListProps {
  filings: MeFiling[];
}

function formatImpact(value: number): string {
  if (Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export default function FilingsList({ filings }: FilingsListProps) {
  if (!filings.length) {
    return (
      <div className="py-10 text-center text-[13px] text-muted-foreground">
        No filings yet
      </div>
    );
  }

  return (
    <div>
      {filings.map((filing) => {
        const label = filing.title ?? filing.category ?? 'Report';
        const isPositive = filing.type === 'positive' || filing.delta > 0;
        const isNegative = filing.type === 'negative' || filing.delta < 0;

        return (
          <Link
            key={filing.id}
            to={`/reports/${filing.id}`}
            className="flex items-center gap-3 rounded-lg border-b border-border px-1 py-3 transition-colors last:border-0 hover:bg-muted/30"
          >
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
                isPositive ? 'bg-green-500' : isNegative ? 'bg-red-500' : 'bg-muted-foreground',
              )}
            >
              {isPositive ? '+' : isNegative ? '−' : '·'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-snug text-foreground">
                {label}
              </p>
              {filing.category ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {filing.category}
                </span>
              ) : null}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {filing.created_at ? formatRelativeTime(filing.created_at) : ''}
              </p>
            </div>

            <div
              className={cn(
                'shrink-0 text-[14px] font-bold',
                filing.delta > 0
                  ? 'text-green-600'
                  : filing.delta < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground',
              )}
            >
              {formatImpact(filing.delta)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
