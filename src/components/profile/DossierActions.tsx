'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, FileWarning, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ReportModal } from '@/components/report/ReportModal';

type ClaimMethod = 'bio_code' | 'dm_screenshot' | 'oauth';

export function DossierActions({ accountId, claimedBy }: { accountId: string; claimedBy?: string | null }) {
  const { user } = useAuth();
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>('bio_code');
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<string>('user');
  const owned = Boolean(user && claimedBy === user.uid);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRole('user');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const payload = await res.json();
        if (cancelled) return;
        if (payload.ok && payload.data?.user?.role) {
          setRole(payload.data.user.role);
        }
      } catch {
        // leave role at default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function submitClaim() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofType: claimMethod,
          proofPayload: claimNote.trim() ? { note: claimNote.trim() } : {}
        })
      });
      const payload = await response.json();
      if (payload.ok) {
        toast.push('Claim submitted — pending admin review.');
        setClaimOpen(false);
        setClaimNote('');
      } else {
        toast.push(payload.error?.message ?? 'Claim could not be submitted.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAudit() {
    const response = await fetch(`/api/accounts/${accountId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const payload = await response.json();
    toast.push(payload.ok ? 'Audit request entered into the queue.' : payload.error.message);
    if (payload.ok) setAuditOpen(false);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-3">
        <Button onClick={() => setReportOpen(true)}>
          <FileWarning size={16} />
          Report
        </Button>
        <Button variant="secondary" disabled={!user} onClick={() => setClaimOpen(true)}>
          <BadgeCheck size={16} />
          Claim
        </Button>
        <Button variant="secondary" disabled={!owned && role !== 'admin'} onClick={() => setAuditOpen(true)}>
          <RefreshCcw size={16} />
          Audit
        </Button>
      </div>
      <ReportModal open={reportOpen} accountId={accountId} onClose={() => setReportOpen(false)} />
      <Modal open={claimOpen} title="Claim account" onClose={() => setClaimOpen(false)}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            All claims are reviewed manually by an admin. Pick the proof method you intend to provide and add any context.
          </p>
          <div className="space-y-2">
            {(['bio_code', 'dm_screenshot', 'oauth'] as ClaimMethod[]).map((method) => (
              <label key={method} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="claim-method"
                  value={method}
                  checked={claimMethod === method}
                  onChange={() => setClaimMethod(method)}
                />
                <span className="capitalize">{method.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
          <Textarea
            value={claimNote}
            onChange={(event) => setClaimNote(event.target.value)}
            placeholder="Optional: paste a link to your proof or notes for the admin."
          />
          <Button className="w-full" onClick={submitClaim} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        </div>
      </Modal>
      <Modal open={auditOpen} title="Request audit" onClose={() => setAuditOpen(false)}>
        <div className="space-y-4">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="audit reason" />
          <Button className="w-full" onClick={requestAudit}>
            Request audit
          </Button>
        </div>
      </Modal>
    </>
  );
}
