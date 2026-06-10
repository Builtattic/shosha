import { cn } from '@/lib/utils';

interface SwipeScoreBreakdownCardProps {
  swipeAggregate?: {
    score: number;
    aligns: number;
    opposes: number;
  } | null;
  totalScore: number;
}

export default function SwipeScoreBreakdownCard({
  swipeAggregate,
  totalScore,
}: SwipeScoreBreakdownCardProps) {
  const aggregate = swipeAggregate ?? { score: 0, aligns: 0, opposes: 0 };
  const swipeNet = aggregate.score ?? 0;
  const reportPart = totalScore - swipeNet;
  const loading = !swipeAggregate;

  return (
    <div className="rounded-[16px] border border-border/50 bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Swipe Rating</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? 'Swipe data loading…'
              : 'Community alignment from People page'}
          </p>
          {/* TODO: wire /me/swipe-aggregate when endpoint exists (Day 13+) */}
        </div>
        <span
          className={cn(
            'font-mono text-lg font-bold',
            swipeNet >= 0 ? 'text-emerald-500' : 'text-red-500',
          )}
        >
          {swipeNet >= 0 ? '+' : ''}
          {swipeNet}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Report score</span>
          <span className="font-mono font-medium text-foreground">{reportPart}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Swipe rating</span>
          <span
            className={cn(
              'font-mono font-medium',
              swipeNet >= 0 ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {swipeNet >= 0 ? '+' : ''}
            {swipeNet}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-sm">
          <span className="font-medium text-foreground">Total score</span>
          <span className="font-mono text-lg font-bold text-foreground">{totalScore}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-emerald-500">{aggregate.aligns}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Aligned</p>
        </div>
        <div className="flex-1 rounded-xl bg-red-500/10 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-red-500">{aggregate.opposes}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Opposed</p>
        </div>
        <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-foreground">
            {aggregate.aligns + aggregate.opposes}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Total swipes</p>
        </div>
      </div>
    </div>
  );
}
