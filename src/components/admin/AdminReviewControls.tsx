'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Info, Zap, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BASE_SCORE, CIRCUMSTANCES_LABELS, SHEET_SCORING_INDEX, calcDelta, calcMultiplierQuotient, type EventMultipliers } from '@/lib/scoring';

export function AdminReviewControls({
  reportId,
  proposedImpact,
  score,
  reportType,
  initialCategory,
  initialDeed,
  initialBaseScore,
  initialRepetitionPattern,
  initialIntent,
  initialCircumstances,
  initialMultipliers,
}: {
  reportId: string;
  proposedImpact: number;
  score: number;
  reportType: 'positive' | 'negative';
  initialCategory?: string;
  initialDeed?: string;
  initialBaseScore?: number;
  initialRepetitionPattern?: string;
  initialIntent?: string;
  initialCircumstances?: string;
  initialMultipliers?: EventMultipliers;
}) {
  const router = useRouter();
  const toast = useToast();
  const typedRows = SHEET_SCORING_INDEX.filter((row) => row.type === reportType);
  const firstRow = typedRows.find((row) => row.deed === initialDeed) ?? typedRows[0];
  const [category, setCategory] = useState(initialCategory ?? firstRow.category);
  const [deed, setDeed] = useState(initialDeed ?? firstRow.deed);
  const selectedRow = typedRows.find((row) => row.category === category && row.deed === deed) ?? firstRow;
  const [baseScore, setBaseScore] = useState(initialBaseScore ?? selectedRow.baseScore);
  const [note, setNote] = useState('');
  const [repetitionPattern, setRepetitionPattern] = useState(initialRepetitionPattern ?? '1');
  const [intent, setIntent] = useState(initialIntent ?? '1');
  const [circumstances, setCircumstances] = useState(initialCircumstances ?? '1');
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const scoreColor = score >= BASE_SCORE ? 'text-foreground' : score >= 0 ? 'text-muted-foreground' : 'text-destructive';
  const impactColor = baseScore > 0 ? 'text-foreground' : baseScore < 0 ? 'text-destructive' : 'text-muted-foreground';
  const categories = Array.from(new Set(typedRows.map((row) => row.category)));
  const deeds = typedRows.filter((row) => row.category === category);
  const previewMultipliers: EventMultipliers = {
    ...(initialMultipliers ?? {
      identity: 1,
      power: 1,
      means: 1,
      environment: 1,
      ability: 1,
      responsibility: 1,
      awareness: 1,
    }),
    reputation: Number(repetitionPattern),
    intent: Number(intent),
    circumstances: Number(circumstances),
  };
  const multiplierQuotient = calcMultiplierQuotient(previewMultipliers);
  const previewDelta = calcDelta(baseScore, previewMultipliers);
  const selectClass = 'w-full min-h-12 rounded-xl border border-border bg-card px-3 py-3 text-[13px] font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  async function decide(verdict: 'approved' | 'rejected') {
    if (verdict === 'rejected' && !confirmReject) {
      setConfirmReject(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          finalImpact: Math.round(previewDelta),
          note,
          category,
          deed,
          baseScore,
          repetitionPattern,
          intent,
          circumstances,
        }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Decision failed');
      toast.push(verdict === 'approved' ? 'Decision entered into the ledger.' : 'Filing rejected.');
      router.push('/admin/queue');
      router.refresh();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Workbook ledger preview */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Zap size={15} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Workbook Ledger</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-muted-foreground">Preview before committing the report.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-left sm:text-right">
            <span className={`block text-3xl font-mono font-black ${impactColor} leading-none`}>
              {previewDelta > 0 ? '+' : ''}{previewDelta.toLocaleString()}
            </span>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-widest text-muted-foreground">Preview delta</span>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => {
                const nextCategory = e.target.value;
                const first = typedRows.find((row) => row.category === nextCategory) ?? selectedRow;
                setCategory(nextCategory);
                setDeed(first.deed);
                setBaseScore(first.baseScore);
              }}
              className={selectClass}
            >
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deed</label>
            <select
              value={deed}
              onChange={(e) => {
                const row = deeds.find((item) => item.deed === e.target.value) ?? selectedRow;
                setDeed(row.deed);
                setBaseScore(row.baseScore);
              }}
              className={selectClass}
            >
              {deeds.map((item) => <option key={`${item.category}:${item.deed}`} value={item.deed}>{item.deed}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Base</p>
              <p className={`text-lg font-black ${impactColor}`}>{baseScore > 0 ? '+' : ''}{baseScore}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">MQ</p>
              <p className="text-lg font-black text-foreground">{multiplierQuotient}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Formula</p>
              <p className="text-lg font-black text-foreground">v1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Info size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repetition (RP)</label>
          </div>
          <select 
            value={repetitionPattern} 
            onChange={(e) => setRepetitionPattern(e.target.value)}
            className={selectClass}
          >
            <option value="0.5">Isolated Incident (0.5)</option>
            <option value="1">Occasional (1.0)</option>
            <option value="1.5">Regular (1.5)</option>
            <option value="2">Frequent (2.0)</option>
            <option value="2.5">Systemic (2.5)</option>
            <option value="3">Chronic (3.0)</option>
          </select>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <AlertCircle size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intent (IN)</label>
          </div>
          <select 
            value={intent} 
            onChange={(e) => setIntent(e.target.value)}
            className={selectClass}
          >
            <option value="0.5">Accidental (0.5)</option>
            <option value="1">Negligent (1.0)</option>
            <option value="1.5">Reckless (1.5)</option>
            <option value="2">Intentional (2.0)</option>
            <option value="2.5">Coordinated (2.5)</option>
            <option value="3">Malicious (3.0)</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Info size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Circumstances (C)</label>
          </div>
          <select
            value={circumstances}
            onChange={(e) => setCircumstances(e.target.value)}
            className={selectClass}
          >
            {Object.entries(CIRCUMSTANCES_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label} ({value})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Internal Note */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Adjudication Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Detailed reasoning for the tribunal's decision..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-card p-4 text-[13px] font-medium leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Score Preview Banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Live Score</p>
            <p className="text-xs font-bold text-muted-foreground">Authorized for ledger update</p>
          </div>
        </div>
        <div className={`text-3xl font-mono font-black ${scoreColor}`}>
          {score.toLocaleString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => decide('rejected')}
          disabled={loading}
          className={`flex min-h-14 items-center justify-center gap-3 rounded-xl border transition-all disabled:opacity-50 text-[12px] font-black uppercase tracking-[0.1em] ${
            confirmReject
              ? 'bg-destructive/10 border-destructive text-destructive animate-pulse'
              : 'bg-background border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
          }`}
        >
          <XCircle size={18} />
          {confirmReject ? 'Confirm Rejection' : 'Dismiss Filing'}
        </button>
        
        <button
          onClick={() => decide('approved')}
          disabled={loading}
          className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-foreground text-background text-[12px] font-black uppercase tracking-[0.1em] transition-all hover:bg-foreground/90 disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {loading ? 'Finalizing...' : 'Commit Verdict'}
        </button>
      </div>
    </div>
  );
}
