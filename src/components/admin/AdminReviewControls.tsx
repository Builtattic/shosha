'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Gavel } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const previewScore = Math.min(100, Math.max(0, score + impact));
  const scoreColor = previewScore >= 70 ? 'text-emerald-400' : previewScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const impactColor = impact > 0 ? 'text-emerald-400' : impact < 0 ? 'text-red-400' : 'text-white/40';

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
        body: JSON.stringify({ verdict, finalImpact: impact, note }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Decision failed');
      toast.push(verdict === 'approved' ? 'Decision entered into the ledger.' : 'Filing rejected.');
      router.push('/admin');
      router.refresh();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Gavel size={15} className="text-amber-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Admin Decision</p>
      </div>

      {/* Impact slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/50">Final Impact</label>
          <span className={`text-xl font-black font-mono ${impactColor}`}>
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
          className="w-full accent-white cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>-10</span>
          <span>0</span>
          <span>+10</span>
        </div>
      </div>

      {/* Score preview */}
      <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/8 px-4 py-3 mb-5">
        <span className="text-xs text-white/40">Score preview</span>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono">{score}</span>
          <span className="text-white/20">→</span>
          <span className={`text-lg font-black font-mono ${scoreColor}`}>{previewScore}</span>
        </div>
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Internal note (optional)…"
        rows={2}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none mb-4"
      />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => decide('rejected')}
          disabled={loading}
          className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all disabled:opacity-50 ${
            confirmReject
              ? 'bg-red-500/30 border-red-500/50 text-red-300 animate-pulse'
              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}
        >
          <XCircle size={15} />
          {confirmReject ? 'Confirm reject' : 'Reject'}
        </button>
        <button
          onClick={() => decide('approved')}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
        >
          <CheckCircle size={15} />
          {loading ? 'Saving…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
