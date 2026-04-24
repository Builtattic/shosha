'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function AdminReviewControls({
  reportId,
  proposedImpact,
  score
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

  async function decide(verdict: 'approved' | 'rejected') {
    if (verdict === 'rejected' && !confirmReject) {
      setConfirmReject(true);
      return;
    }
    const response = await fetch(`/api/reports/${reportId}/adjudicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict, finalImpact: impact, note })
    });
    const payload = await response.json();
    toast.push(payload.ok ? 'Decision entered into the ledger.' : payload.error.message);
    if (payload.ok) router.push('/admin');
    router.refresh();
  }

  return (
    <div className="space-y-4 border border-border bg-raised p-4">
      <div>
        <label className="text-xs uppercase text-muted" htmlFor="impact">
          Final impact {impact}
        </label>
        <input
          id="impact"
          className="mt-3 w-full accent-accent"
          type="range"
          min="-10"
          max="10"
          step="1"
          value={impact}
          onChange={(event) => setImpact(Number(event.target.value))}
        />
        <p className="mt-2 text-sm text-muted">Preview score {Math.min(100, Math.max(0, score + impact))}</p>
      </div>
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="internal note" />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={() => decide('rejected')}>
          {confirmReject ? 'Confirm reject' : 'Reject'}
        </Button>
        <Button onClick={() => decide('approved')}>Approve and apply</Button>
      </div>
    </div>
  );
}
