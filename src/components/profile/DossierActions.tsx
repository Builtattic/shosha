'use client';

import { useState } from 'react';
import { BadgeCheck, FileWarning, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ReportModal } from '@/components/report/ReportModal';

export function DossierActions({ accountId, claimedBy }: { accountId: string; claimedBy?: string | null }) {
  const { user } = useAuth();
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const role: string = 'user'; // TODO: fetch from RTDB
  const owned = Boolean(user && claimedBy === user.uid);

  async function claim(proofType: 'bio_code' | 'dm_screenshot' | 'oauth') {
    const response = await fetch(`/api/accounts/${accountId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofType, proofPayload: {} })
    });
    const payload = await response.json();
    toast.push(payload.ok ? 'Claim entered into tribunal review.' : payload.error.message);
    if (payload.ok) setClaimOpen(false);
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
        <div className="space-y-2">
          <Button className="w-full" variant="secondary" onClick={() => claim('bio_code')}>
            Bio code
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => claim('dm_screenshot')}>
            DM screenshot
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => claim('oauth')}>
            OAuth placeholder
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
