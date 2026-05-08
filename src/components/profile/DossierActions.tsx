'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, FileWarning, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { ClaimProfileModal } from '@/components/profile/ClaimProfileModal';

export function DossierActions({
  accountId,
  claimedBy,
  claimable = true,
  targetName,
  targetHandle,
  targetAvatar,
}: {
  accountId: string;
  claimedBy?: string | null;
  claimable?: boolean;
  targetName?: string;
  targetHandle?: string;
  targetAvatar?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const reportModal = useReportModal();
  const [claimOpen, setClaimOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [role, setRole] = useState<string>('user');
  const owned = Boolean(user && claimedBy === user.uid);
  const adminCapable = ['moderator', 'editor', 'admin', 'super_admin'].includes(role);

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

  async function requestAudit() {
    const response = await fetch(`/api/accounts/${accountId}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const payload = await response.json();
    toast.push(payload.ok ? 'Audit request entered into the queue.' : payload.error.message);
    if (payload.ok) setAuditOpen(false);
  }

  const safeName = targetName || 'This account';
  const safeHandle = targetHandle || 'profile';
  const safeAvatar = targetAvatar
    || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(safeName)}&backgroundColor=1a1a1a&textColor=ffffff`;

  return (
    <>
      <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white text-[12px] h-8 px-3"
          onClick={() => reportModal.open({ accountId })}
        >
          <FileWarning size={14} className="mr-1.5" />
          Report
        </Button>
        {claimable ? (
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white text-[12px] h-8 px-3"
            disabled={!user}
            onClick={() => setClaimOpen(true)}
          >
            <BadgeCheck size={14} className="mr-1.5" />
            Claim This Profile
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="text-[12px] h-8 px-3" disabled>
            <BadgeCheck size={14} className="mr-1.5" />
            Public figure
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="text-[12px] h-8 px-3"
          disabled={!owned && !adminCapable}
          onClick={() => setAuditOpen(true)}
        >
          <RefreshCcw size={14} className="mr-1.5" />
          Audit
        </Button>
      </div>

      <ClaimProfileModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        accountId={accountId}
        targetUser={{ name: safeName, handle: safeHandle, avatar: safeAvatar }}
      />

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
