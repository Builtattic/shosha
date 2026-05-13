import { cn } from '@/lib/utils';

export type SwipeAggregate = {
  score: number;
  aligns: number;
  opposes: number;
};

type Props = {
  swipeAggregate: SwipeAggregate;
  totalScore: number;
};

export function SwipeScoreBreakdownCard({ swipeAggregate, totalScore }: Props) {
  const swipeNet = swipeAggregate.score ?? 0;
  const reportPart = totalScore - swipeNet;

  return (
    <div className="rounded-[16px] border border-border/50 bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Swipe Rating</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Community alignment from People page</p>
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
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Report score</span>
          </div>
          <span className="font-mono font-medium text-foreground">{reportPart}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-muted-foreground">Swipe rating</span>
          </div>
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
          <p className="text-lg font-bold text-emerald-500">{swipeAggregate.aligns}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Aligned</p>
        </div>
        <div className="flex-1 rounded-xl bg-red-500/10 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-red-500">{swipeAggregate.opposes}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Opposed</p>
        </div>
        <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-foreground">{swipeAggregate.aligns + swipeAggregate.opposes}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Total swipes</p>
        </div>
      </div>
    </div>
  );
}
