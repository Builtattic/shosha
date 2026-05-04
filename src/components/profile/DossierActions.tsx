'use client';

import { useEffect, useState, useRef } from 'react';
import { BadgeCheck, FileWarning, RefreshCcw, UploadCloud, CheckCircle2, ChevronLeft, Loader2, Video, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useReportModal } from '@/components/report/ReportModalProvider';
import { cn } from '@/lib/utils';

type UploadedMedia = {
  url: string;
  type: 'image' | 'video';
  bytes: number;
};


type ClaimMethod = 'bio_code' | 'dm_screenshot' | 'oauth';

export function DossierActions({
  accountId,
  claimedBy,
  claimable = true
}: {
  accountId: string;
  claimedBy?: string | null;
  claimable?: boolean;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const reportModal = useReportModal();
  const [claimOpen, setClaimOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [reason, setReason] = useState('');
  // Claim Wizard State
  const [claimStep, setClaimStep] = useState(1);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimIdMedia, setClaimIdMedia] = useState<UploadedMedia | null>(null);
  const [claimLivenessMedia, setClaimLivenessMedia] = useState<UploadedMedia | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'id' | 'liveness' | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>('bio_code');
  const [submitting, setSubmitting] = useState(false);
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

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: form });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Upload failed');
      
      const mediaInfo = {
        url: payload.data.url,
        thumbUrl: payload.data.thumbUrl,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        bytes: file.size
      };
      
      if (uploadTarget === 'id') {
        setClaimIdMedia(mediaInfo);
      } else {
        setClaimLivenessMedia(mediaInfo);
      }
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submitClaim() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofType: 'wizard_flow',
          proofPayload: {
            email: claimEmail,
            idMedia: claimIdMedia,
            livenessMedia: claimLivenessMedia
          }
        })
      });
      const payload = await response.json();
      if (payload.ok) {
        setClaimStep(4);
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
      <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-[12px] h-8 px-3" onClick={() => reportModal.open({ accountId })}>
          <FileWarning size={14} className="mr-1.5" />
          Report
        </Button>
        {claimable ? (
          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-[12px] h-8 px-3" disabled={!user} onClick={() => setClaimOpen(true)}>
            <BadgeCheck size={14} className="mr-1.5" />
            Claim This Profile
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="text-[12px] h-8 px-3" disabled>
            <BadgeCheck size={14} className="mr-1.5" />
            Public figure
          </Button>
        )}
        <Button size="sm" variant="secondary" className="text-[12px] h-8 px-3" disabled={!owned && !adminCapable} onClick={() => setAuditOpen(true)}>
          <RefreshCcw size={14} className="mr-1.5" />
          Audit
        </Button>
      </div>
      <Modal open={claimOpen} title={claimStep === 4 ? "Verification Submitted" : claimStep === 1 ? "Claim Profile" : claimStep === 2 ? "Verify Your Identity" : "Liveness Check"} onClose={() => { setClaimOpen(false); setClaimStep(1); }}>
        <div className="space-y-6 pb-2 text-sm">
          {claimStep === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">To claim this profile, please provide your email address. We will use this to contact you regarding your verification status.</p>
              <div>
                <label className="text-[13px] font-bold">Email Address</label>
                <Input value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="email@example.com" className="mt-1.5 bg-background border-border" />
              </div>
              <Button className="w-full bg-foreground text-background" onClick={() => setClaimStep(2)} disabled={!claimEmail || !claimEmail.includes('@')}>Continue</Button>
            </div>
          )}
          
          {claimStep === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">Please upload a valid government-issued ID (Passport, Driver License, or National ID).</p>
              
              <button
                onClick={() => { setUploadTarget('id'); fileInputRef.current?.click(); }}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed bg-card/50 p-8 transition-colors",
                  claimIdMedia ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                )}
              >
                {claimIdMedia ? (
                  <>
                    <div className="rounded-full bg-primary/10 p-3 text-primary"><CheckCircle2 size={24} /></div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-primary">ID Uploaded Successfully</p>
                      <p className="text-[12px] text-muted-foreground">Click to change file</p>
                    </div>
                  </>
                ) : uploading && uploadTarget === 'id' ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    <p className="text-[13px] font-medium text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-muted p-3 text-muted-foreground"><UploadCloud size={24} /></div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold">Upload Government ID</p>
                      <p className="text-[12px] text-muted-foreground">Front side only (JPEG, PNG)</p>
                    </div>
                  </>
                )}
              </button>
              
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setClaimStep(1)}>Back</Button>
                <Button className="flex-1 bg-foreground text-background" onClick={() => setClaimStep(3)} disabled={!claimIdMedia || uploading}>Continue</Button>
              </div>
            </div>
          )}
          
          {claimStep === 3 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">Please record or upload a short selfie video to confirm your identity matches the provided ID.</p>
              
              <button
                onClick={() => { setUploadTarget('liveness'); fileInputRef.current?.click(); }}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed bg-card/50 p-8 transition-colors",
                  claimLivenessMedia ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                )}
              >
                {claimLivenessMedia ? (
                  <>
                    <div className="rounded-full bg-primary/10 p-3 text-primary"><CheckCircle2 size={24} /></div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-primary">Video Uploaded Successfully</p>
                      <p className="text-[12px] text-muted-foreground">Click to change file</p>
                    </div>
                  </>
                ) : uploading && uploadTarget === 'liveness' ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    <p className="text-[13px] font-medium text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-muted p-3 text-muted-foreground"><Video size={24} /></div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold">Upload Selfie Video</p>
                      <p className="text-[12px] text-muted-foreground">MP4 or MOV format</p>
                    </div>
                  </>
                )}
              </button>
              
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setClaimStep(2)}>Back</Button>
                <Button className="flex-1 bg-foreground text-background" onClick={submitClaim} disabled={!claimLivenessMedia || submitting}>
                  {submitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </div>
            </div>
          )}

          {claimStep === 4 && (
            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-[18px] font-bold mb-2">Verification Submitted</h3>
                <p className="text-[13px] text-muted-foreground max-w-[280px]">Your claim is currently under review by an administrator. We will notify you via email once approved.</p>
              </div>
              <Button className="w-full mt-4 bg-foreground text-background" onClick={() => { setClaimOpen(false); setClaimStep(1); }}>Done</Button>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={uploadTarget === 'liveness' ? "video/*" : "image/*"}
            onChange={handleFile}
          />
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
