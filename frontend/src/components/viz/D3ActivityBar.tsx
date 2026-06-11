import { cn } from '@/lib/utils';

interface D3ActivityBarProps {
  positive: number;
  negative: number;
  neutral?: number;
  height?: number;
}

export function D3ActivityBar({
  positive,
  negative,
  neutral = 0,
  height = 8,
}: D3ActivityBarProps) {
  const total = positive + negative + neutral;
  const posPct = total > 0 ? (positive / total) * 100 : 0;
  const negPct = total > 0 ? (negative / total) * 100 : 0;
  const neuPct = total > 0 ? (neutral / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex w-full overflow-hidden rounded-full bg-muted',
          total === 0 && 'opacity-50',
        )}
        style={{ height }}
        role="img"
        aria-label={`Activity: ${positive} positive, ${negative} negative, ${neutral} neutral`}
      >
        {total === 0 ? (
          <div className="h-full w-full bg-muted" />
        ) : (
          <>
            {posPct > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${posPct}%` }}
              />
            )}
            {negPct > 0 && (
              <div
                className="h-full bg-red-500"
                style={{ width: `${negPct}%` }}
              />
            )}
            {neuPct > 0 && (
              <div
                className="h-full bg-zinc-400 dark:bg-zinc-600"
                style={{ width: `${neuPct}%` }}
              />
            )}
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-muted-foreground">
        <span className="text-green-600">+{positive} positive</span>
        <span className="text-red-500">−{negative} negative</span>
        {neutral > 0 && <span>{neutral} neutral</span>}
      </div>
    </div>
  );
}

export default D3ActivityBar;
