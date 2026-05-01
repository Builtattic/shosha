'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Info, Zap, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BASE_SCORE } from '@/lib/scoring';
import { motion } from 'framer-motion';

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

  const scoreColor = score >= BASE_SCORE ? 'text-emerald-500' : score >= 0 ? 'text-amber-500' : 'text-red-500';
  const impactColor = impact > 0 ? 'text-emerald-500' : impact < 0 ? 'text-red-500' : 'text-muted-foreground';

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
    <div className="space-y-10">
      {/* Impact Section */}
      <div className="relative p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap size={80} />
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Adjudicated Impact</label>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-4xl font-mono font-black ${impactColor} leading-none`}>
              {impact > 0 ? '+' : ''}{impact}
            </span>
            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1">Dossier delta</span>
          </div>
        </div>

        <div className="relative h-12 flex items-center">
          <div className="absolute inset-x-0 h-1.5 bg-white/5 rounded-full" />
          <div 
            className="absolute h-1.5 bg-primary/40 rounded-full transition-all duration-300" 
            style={{ 
              left: '50%', 
              right: impact > 0 ? 'auto' : `${50 + (impact / 20) * 100}%`,
              width: `${Math.abs(impact / 20) * 100}%`,
              transform: impact > 0 ? 'none' : 'translateX(-100%)'
            }} 
          />
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={impact}
            onChange={(e) => { setImpact(Number(e.target.value)); setConfirmReject(false); }}
            className="relative w-full bg-transparent appearance-none cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/20"
          />
        </div>
        
        <div className="flex justify-between text-[9px] font-black text-muted-foreground/30 mt-4 uppercase tracking-[0.1em]">
          <span>Maximum Penalty</span>
          <span>Neutral</span>
          <span>Maximum Reward</span>
        </div>
      </div>

      {/* Protocol Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Info size={12} className="text-muted-foreground/60" />
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repetition (RP)</label>
          </div>
          <select 
            value={repetitionPattern} 
            onChange={(e) => setRepetitionPattern(e.target.value)}
            className="w-full h-14 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold focus:outline-none focus:border-primary/40 transition-all appearance-none"
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
            className="w-full h-14 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold focus:outline-none focus:border-primary/40 transition-all appearance-none"
          >
            <option value="0.5">Accidental (0.5)</option>
            <option value="1">Negligent (1.0)</option>
            <option value="1.5">Reckless (1.5)</option>
            <option value="2">Intentional (2.0)</option>
            <option value="2.5">Coordinated (2.5)</option>
            <option value="3">Malicious (3.0)</option>
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
          className="w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-medium placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-all resize-none leading-relaxed"
        />
      </div>

      {/* Score Preview Banner */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/[0.03] border border-primary/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Live Score</p>
            <p className="text-xs font-bold text-primary/80">Authorized for ledger update</p>
          </div>
        </div>
        <div className={`text-3xl font-mono font-black ${scoreColor}`}>
          {score.toLocaleString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => decide('rejected')}
          disabled={loading}
          className={`flex items-center justify-center gap-3 h-16 rounded-2xl border-2 transition-all disabled:opacity-50 text-[13px] font-black uppercase tracking-[0.1em] ${
            confirmReject
              ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse'
              : 'bg-transparent border-white/5 text-muted-foreground hover:bg-red-500 hover:text-white hover:border-red-500'
          }`}
        >
          <XCircle size={18} />
          {confirmReject ? 'Confirm Rejection' : 'Dismiss Filing'}
        </button>
        
        <button
          onClick={() => decide('approved')}
          disabled={loading}
          className="flex items-center justify-center gap-3 h-16 rounded-2xl bg-primary text-primary-foreground text-[13px] font-black uppercase tracking-[0.1em] hover:opacity-90 shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {loading ? 'Finalizing...' : 'Commit Verdict'}
        </button>
      </div>
    </div>
  );
}
