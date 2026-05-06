'use client';

import { useState } from 'react';
import { BarChart3, ListTree, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type WindowScores = {
  w1Delta: number;
  w1Decay: number;
  w1Score: number;
  w2Delta: number;
  w2Decay: number;
  w2Score: number;
  w3Delta: number;
  w3Decay: number;
  w3Score: number;
};

function formatDelta(value: number) {
  return `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString()}`;
}

export function ScoreLedgerPanel({
  windowScores,
  globalScore,
  viewerIsAdmin,
}: {
  windowScores: WindowScores;
  globalScore?: number;
  viewerIsAdmin: boolean;
}) {
  const [mode, setMode] = useState<'summary' | 'workbook'>(viewerIsAdmin ? 'workbook' : 'summary');

  return (
    <div className="mt-4 rounded-[24px] border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
            {mode === 'summary' ? <Sparkles size={15} /> : <ListTree size={15} />}
            {mode === 'summary' ? 'Score Summary' : 'Workbook Score Tracker'}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {mode === 'summary' ? 'Plain-language reputation movement' : 'Internal scoring windows'}
          </p>
        </div>
        {viewerIsAdmin ? (
          <button
            type="button"
            onClick={() => setMode(mode === 'summary' ? 'workbook' : 'summary')}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:bg-background"
          >
            <BarChart3 size={13} />
            {mode === 'summary' ? 'Workbook' : 'Summary'}
          </button>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Ledger
          </span>
        )}
      </div>

      {mode === 'summary' ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">This Week</p>
              <p className="mt-1 text-[15px] font-black text-foreground">{formatDelta(windowScores.w1Delta)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Recent activity</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">This Month</p>
              <p className="mt-1 text-[15px] font-black text-foreground">{formatDelta(windowScores.w2Delta)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">30-day trend</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">All Time</p>
              <p className="mt-1 text-[15px] font-black text-foreground">
                {Math.round(windowScores.w3Score).toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">Lifetime score</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2 text-[12px] font-bold">
            <span className="text-muted-foreground">Total reputation points</span>
            <span className="text-foreground">{Math.round(globalScore ?? 0).toLocaleString()}</span>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['W1', windowScores.w1Delta, windowScores.w1Decay, windowScores.w1Score],
              ['W2', windowScores.w2Delta, windowScores.w2Decay, windowScores.w2Score],
              ['W3', windowScores.w3Delta, windowScores.w3Decay, windowScores.w3Score],
            ].map(([label, windowDelta, decayValue, scoreValue]) => (
              <div key={String(label)} className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-[15px] font-black text-foreground">{Number(scoreValue).toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Delta {Number(windowDelta).toLocaleString()} / decay {Number(decayValue).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2 text-[12px] font-bold">
            <span className="text-muted-foreground">Lifetime ledger total</span>
            <span className={cn('text-foreground')}>{Math.round(globalScore ?? 0).toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
}
