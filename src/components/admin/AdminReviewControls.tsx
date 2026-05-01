'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BASE_SCORE } from '@/lib/scoring';

export function AdminReviewControls({
  reportId,
  proposedImpact,
  score,
}: {
  reportId: string;
  proposedImpact: number;
  score: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [impact, setImpact] = useState(proposedImpact);
  const [note, setNote] = useState('');
  const [repetitionPattern, setRepetitionPattern] = useState('0.5');
  const [intent, setIntent] = useState('0.5');
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const scoreColor = score >= BASE_SCORE ? 'text-emerald-600' : score >= 0 ? 'text-amber-600' : 'text-destructive';
  const impactColor = impact > 0 ? 'text-emerald-600' : impact < 0 ? 'text-destructive' : 'text-muted-foreground';

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
        body: JSON.stringify({ verdict, finalImpact: impact, note, repetitionPattern, intent }),
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
      {/* Impact slider */}
      <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Adjudicated Impact</label>
          <span className={`text-2xl font-black font-mono ${impactColor}`}>
            {impact > 0 ? '+' : ''}{impact}
          </span>
        </div>
        <input
          type="range"
          min="-10"
          max="10"
          step="1"
          value={impact}
          onChange={(e) => { setImpact(Number(e.target.value)); setConfirmReject(false); }}
          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] font-black text-muted-foreground/40 mt-2 uppercase tracking-tighter">
          <span>Heavy Penalty (-10)</span>
          <span>Zero</span>
          <span>Max Reward (+10)</span>
        </div>
      </div>

      {/* Score preview */}
      <div className="flex items-center justify-between rounded-2xl bg-primary/5 border border-primary/10 px-6 py-4">
        <span className="text-[13px] font-bold text-primary/70">Current Shosha Score</span>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-black font-mono ${scoreColor}`}>{score.toLocaleString()}</span>
        </div>
      </div>

      {/* Repetition & Intent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Repetition (RP)</label>
          <select 
            value={repetitionPattern} 
            onChange={(e) => setRepetitionPattern(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
          >
            <option value="0.5">No Clear Pattern (0.5)</option>
            <option value="1">Balanced (1)</option>
            <option value="1.5">Mixed Signals (1.5)</option>
            <option value="2">Leaning Off (2)</option>
            <option value="2.5">Pattern Forming (2.5)</option>
            <option value="3">Consistent Pattern (3)</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Intent (IN)</label>
          <select 
            value={intent} 
            onChange={(e) => setIntent(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
          >
            <option value="0.5">Didn&apos;t mean to (0.5)</option>
            <option value="1">Not Aware (1)</option>
            <option value="1.5">Not Careful (1.5)</option>
            <option value="2">Meant to (2)</option>
            <option value="2.5">Thought Through (2.5)</option>
            <option value="3">Fully Planned (3)</option>
          </select>
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Internal Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reasoning for this decision..."
          rows={3}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none font-medium"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => decide('rejected')}
          disabled={loading}
          className={`flex items-center justify-center gap-2 h-14 rounded-2xl border-2 transition-all disabled:opacity-50 text-[14px] font-black uppercase tracking-wider ${
            confirmReject
              ? 'bg-destructive/10 border-destructive text-destructive animate-pulse'
              : 'bg-background border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive'
          }`}
        >
          <XCircle size={18} />
          {confirmReject ? 'Are you sure?' : 'Reject'}
        </button>
        <button
          onClick={() => decide('approved')}
          disabled={loading}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground text-[14px] font-black uppercase tracking-wider hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {loading ? 'Processing...' : 'Approve Case'}
        </button>
      </div>
    </div>
  );
}
