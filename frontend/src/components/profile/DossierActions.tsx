import { useState } from 'react';
import { BadgeCheck, FileWarning, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useReportModal } from '@/contexts/ReportModalContext';
import { ClaimProfileModal } from '@/components/profile/ClaimProfileModal';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

interface DossierActionsProps {
  accountId: string;
  ownerId: string | null;
  currentUserId: string | null;
  targetName: string;
  targetHandle: string;
  className?: string;
}

export default function DossierActions({
  accountId,
  ownerId,
  currentUserId,
  targetName,
  targetHandle,
  className,
}: DossierActionsProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const reportModal = useReportModal();
  const [claimOpen, setClaimOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  const unclaimed = !ownerId;

  async function requestAudit() {
    if (!reason.trim()) return;
    setAuditing(true);
    try {
      await apiClient.post(`/accounts/${accountId}/audit`, { reason });
      toast.push('Audit request entered into the queue.');
      setAuditOpen(false);
      setReason('');
    } catch {
      toast.push('Could not submit audit request.');
    } finally {
      setAuditing(false);
    }
  }

  return (
    <>
      <div className={cn('flex flex-wrap justify-center gap-2 sm:justify-end', className)}>
        <button
          type="button"
          onClick={() => reportModal.open(accountId)}
          className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-red-600"
        >
          <FileWarning size={14} />
          Report
        </button>

        {unclaimed && currentUserId ? (
          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-green-600"
          >
            <BadgeCheck size={14} />
            Claim This Profile
          </button>
        ) : null}

        <button
          type="button"
          disabled={!isOwner && !isAdmin}
          onClick={() => setAuditOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold text-foreground disabled:opacity-50"
        >
          <RefreshCcw size={14} />
          Audit
        </button>
      </div>

      {currentUserId && unclaimed ? (
        <ClaimProfileModal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          accountId={accountId}
          targetUser={{
            name: targetName,
            handle: targetHandle,
            avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(targetName)}`,
          }}
        />
      ) : null}

      {auditOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <h3 className="text-[16px] font-bold">Request audit</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Audit reason"
              className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-[13px] outline-none"
              rows={4}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAuditOpen(false)}
                className="flex-1 rounded-full border border-border py-2 text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={auditing}
                onClick={requestAudit}
                className="flex-1 rounded-full bg-foreground py-2 text-[13px] font-bold text-background disabled:opacity-50"
              >
                {auditing ? 'Submitting…' : 'Request audit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
