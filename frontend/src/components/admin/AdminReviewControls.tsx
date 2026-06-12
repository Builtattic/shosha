import { useState } from 'react';
import { AlertCircle, CheckCircle, Info, ShieldCheck, XCircle, Zap } from 'lucide-react';
import { moderateReport } from '@/api/admin';
import { useToast } from '@/components/ui/Toast';
import { SHEET_SCORING_INDEX } from '@/lib/scoringIndex';
import { cn } from '@/lib/utils';

interface AdminReviewControlsProps {
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
  onDecided?: (verdict: 'APPROVED' | 'REJECTED') => void;
}

export default function AdminReviewControls({
  reportId,
  score,
  reportType,
  initialCategory,
  initialDeed,
  initialBaseScore,
  initialRepetitionPattern,
  initialIntent,
  initialCircumstances,
  onDecided,
}: AdminReviewControlsProps) {
  const toast = useToast();
  const typedRows = SHEET_SCORING_INDEX.filter((row) => row.type === reportType);
  const firstRow = typedRows.find((row) => row.deed === initialDeed) ?? typedRows[0];

  const [category, setCategory] = useState(initialCategory ?? firstRow?.category ?? '');
  const [deed, setDeed] = useState(initialDeed ?? firstRow?.deed ?? '');
  const selectedRow =
    typedRows.find((row) => row.category === category && row.deed === deed) ?? firstRow ?? typedRows[0];
  const [baseScore, setBaseScore] = useState(initialBaseScore ?? selectedRow?.baseScore ?? 0);
  const [note, setNote] = useState('');
  const [repetitionPattern, setRepetitionPattern] = useState(initialRepetitionPattern ?? '1');
  const [intent, setIntent] = useState(initialIntent ?? '1');
  const [circumstances] = useState(initialCircumstances ?? '1');
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const categories = Array.from(new Set(typedRows.map((row) => row.category)));
  const deeds = typedRows.filter((row) => row.category === category);
  const previewDelta = Math.round(
    baseScore * parseFloat(repetitionPattern) * parseFloat(intent),
  );
  const impactColor =
    baseScore > 0 ? 'text-foreground' : baseScore < 0 ? 'text-destructive' : 'text-muted-foreground';
  const scoreColor =
    score >= 1000 ? 'text-foreground' : score >= 0 ? 'text-muted-foreground' : 'text-destructive';
  const selectClass =
    'w-full min-h-12 rounded-xl border border-border bg-card px-3 py-3 text-[13px] font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  async function decide(verdict: 'APPROVED' | 'REJECTED') {
    if (verdict === 'REJECTED' && !confirmReject) {
      setConfirmReject(true);
      return;
    }
    setLoading(true);
    try {
      await moderateReport(reportId, verdict, note, {
        category,
        deed,
        base_score: baseScore,
        repetition_pattern: parseFloat(repetitionPattern),
        intent: parseFloat(intent),
        circumstances: parseFloat(circumstances),
        final_impact: Math.round(previewDelta),
      });
      toast.push(verdict === 'APPROVED' ? 'Decision entered into the ledger.' : 'Filing rejected.');
      onDecided?.(verdict);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setConfirmReject(false);
    }
  }

  if (!typedRows.length) {
    return (
      <p className="text-sm text-muted-foreground">No scoring rows for this report type.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Zap size={15} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Workbook Ledger
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-muted-foreground">
                Preview before committing the report.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-left sm:text-right">
            <span className={cn('block text-3xl font-mono font-black leading-none', impactColor)}>
              {previewDelta > 0 ? '+' : ''}
              {previewDelta.toLocaleString()}
            </span>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Est. delta (excl. profile)
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Category
            </label>
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
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Deed
            </label>
            <select
              value={deed}
              onChange={(e) => {
                const row = deeds.find((item) => item.deed === e.target.value) ?? selectedRow;
                setDeed(row.deed);
                setBaseScore(row.baseScore);
              }}
              className={selectClass}
            >
              {deeds.map((item) => (
                <option key={`${item.category}:${item.deed}`} value={item.deed}>
                  {item.deed}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Base</p>
              <p className={cn('text-lg font-black', impactColor)}>
                {baseScore > 0 ? '+' : ''}
                {baseScore}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">MQ</p>
              <p className="text-lg font-black text-foreground">
                {(parseFloat(repetitionPattern) * parseFloat(intent)).toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Formula</p>
              <p className="text-lg font-black text-foreground">v1</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="ml-1 flex items-center gap-2">
            <Info size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Repetition (RP)
            </label>
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
          <div className="ml-1 flex items-center gap-2">
            <AlertCircle size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Intent (IN)
            </label>
          </div>
          <select value={intent} onChange={(e) => setIntent(e.target.value)} className={selectClass}>
            <option value="0.5">Accidental (0.5)</option>
            <option value="1">Negligent (1.0)</option>
            <option value="1.5">Reckless (1.5)</option>
            <option value="2">Intentional (2.0)</option>
            <option value="2.5">Coordinated (2.5)</option>
            <option value="3">Malicious (3.0)</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Adjudication Notes
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Detailed reasoning for the tribunal's decision..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-card p-4 text-[13px] font-medium leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-muted-foreground">
              Live Score
            </p>
            <p className="text-xs font-bold text-muted-foreground">Authorized for ledger update</p>
          </div>
        </div>
        <div className={cn('text-3xl font-mono font-black', scoreColor)}>{score.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => decide('REJECTED')}
          disabled={loading}
          className={cn(
            'flex min-h-14 items-center justify-center gap-3 rounded-xl border text-[12px] font-black uppercase tracking-[0.1em] transition-all disabled:opacity-50',
            confirmReject
              ? 'animate-pulse border-destructive bg-destructive/10 text-destructive'
              : 'border-border bg-background text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
          )}
        >
          <XCircle size={18} />
          {confirmReject ? 'Confirm Rejection' : 'Dismiss Filing'}
        </button>
        <button
          type="button"
          onClick={() => decide('APPROVED')}
          disabled={loading}
          className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-foreground text-[12px] font-black uppercase tracking-[0.1em] text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {loading ? 'Finalizing...' : 'Commit Verdict'}
        </button>
      </div>
    </div>
  );
}
