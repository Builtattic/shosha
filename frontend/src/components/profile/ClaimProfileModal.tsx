import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, CheckCircle2, ChevronLeft, Scan, Smartphone, Check,
  Loader2, Camera, Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { createClaim } from '@/api/claims';

type UploadedMedia = {
  url: string;
  type: 'image' | 'video';
  bytes: number;
};

type ClaimStep = 1 | 2 | 3 | 4;

const ID_OPTIONS = [
  { id: 'passport', label: 'Passport' },
  { id: 'license', label: "Driver's License" },
  { id: 'national', label: 'National ID' },
];

export function ClaimProfileModal({
  open,
  onClose,
  accountId,
  targetUser,
}: {
  open: boolean;
  onClose: () => void;
  accountId?: string;
  targetUser: {
    name: string;
    handle: string;
    avatar: string;
  };
}) {
  const toast = useToast();
  const [step, setStep] = useState<ClaimStep>(1);
  const [email, setEmail] = useState('');
  const [selectedIdType, setSelectedIdType] = useState<string>('license');
  const [idMedia, setIdMedia] = useState<UploadedMedia | null>(null);
  const [livenessMedia, setLivenessMedia] = useState<UploadedMedia | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'id' | 'liveness' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setStep(1);
    setEmail('');
    setIdMedia(null);
    setLivenessMedia(null);
    setSelectedIdType('license');
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(true);
    try {
      // TODO: replace with uploadMedia (S3) when wiring evidence file upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      const media: UploadedMedia = {
        url: URL.createObjectURL(file), // Mock URL
        type: file.type.startsWith('video/') ? 'video' : 'image',
        bytes: file.size,
      };
      if (uploadTarget === 'id') setIdMedia(media);
      else setLivenessMedia(media);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submitClaim() {
    if (!accountId) {
      // No account to attach the claim to — fall through to confirmation. Useful for the standalone celebrity flow.
      setStep(4);
      return;
    }
    setSubmitting(true);
    try {
      await createClaim({
        account_id: accountId,
        evidence_type: selectedIdType,
        evidence_payload: {
          email,
          idType: selectedIdType,
          idMedia,
          livenessMedia,
        },
      });
      setStep(4);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim could not be submitted.';
      toast.push(message);
    } finally {
      setSubmitting(false);
    }
  }

  const heading = step === 1 ? 'Claim Profile'
    : step === 2 ? 'Verify Your Identity'
    : step === 3 ? 'Liveness Check'
    : 'Verification Submitted';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-background border border-border p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => (step > 1 && step < 4 ? setStep((s) => (s - 1) as ClaimStep) : close())}
              className="text-muted-foreground hover:text-foreground"
              aria-label={step > 1 && step < 4 ? 'Back' : 'Close'}
            >
              {step > 1 && step < 4 ? <ChevronLeft size={22} /> : <X size={20} />}
            </button>
            <h2 className="text-[16px] font-bold">{heading}</h2>
            <div className="w-6" />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full border-2 border-border bg-card p-1">
                    <img
                      src={targetUser.avatar}
                      alt={targetUser.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <h3 className="mt-3 text-[18px] font-bold">{targetUser.name}</h3>
                  <p className="text-[13px] text-muted-foreground">@{targetUser.handle.replace(/^@/, '')}</p>
                </div>

                <p className="text-[13px] text-muted-foreground text-center px-2">
                  To claim this profile, please verify your identity. We'll send the credentials to your email after successful verification.
                </p>

                <div>
                  <label className="text-[12px] font-bold ml-1">Email Address *</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="team@shoshaworld.com"
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-11"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!email || !email.includes('@')}
                  className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  Continue
                </button>
                <p className="text-center text-[10px] text-muted-foreground italic">🔒 Your identity will remain private</p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <p className="text-[13px] text-muted-foreground">Upload a government ID to verify your identity.</p>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Accepted IDs</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {ID_OPTIONS.map((opt) => {
                      const active = selectedIdType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedIdType(opt.id)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition-all',
                            active ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card opacity-70 hover:opacity-100'
                          )}
                        >
                          <Scan size={20} />
                          <span className="text-[10px] font-bold">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Upload ID</p>
                  <button
                    type="button"
                    onClick={() => { setUploadTarget('id'); fileInputRef.current?.click(); }}
                    className={cn(
                      'flex aspect-[1.6/1] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all',
                      idMedia ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
                    )}
                  >
                    {uploading && uploadTarget === 'id' ? (
                      <>
                        <Loader2 size={26} className="animate-spin text-muted-foreground" />
                        <p className="text-[12px] font-medium text-muted-foreground">Uploading…</p>
                      </>
                    ) : idMedia ? (
                      <>
                        <CheckCircle2 size={28} className="text-primary" />
                        <p className="text-[12px] font-bold text-primary">ID uploaded</p>
                        <p className="text-[10px] text-muted-foreground">Tap to replace</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Smartphone size={22} className="text-muted-foreground" />
                        </div>
                        <p className="text-[13px] font-bold">Upload front side</p>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG or PDF (Max 10MB)</p>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setStep(3)}
                  disabled={!idMedia || uploading}
                  className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  Continue
                </button>
                <p className="text-center text-[10px] text-muted-foreground italic">🔒 Your identity will remain private</p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Take a quick selfie video to confirm you're a real person.
                </p>

                <div className="flex justify-center py-2">
                  <div className="relative">
                    <div className="h-44 w-44 rounded-full border-4 border-primary/20 p-2">
                      <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-primary">
                        <img
                          src={targetUser.avatar}
                          alt="Liveness"
                          className="h-full w-full object-cover grayscale opacity-60"
                        />
                        <div className="absolute inset-0 border-[10px] border-primary/30 rounded-full animate-pulse" />
                      </div>
                    </div>
                    {livenessMedia ? (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground inline-flex items-center gap-1">
                        <Check size={11} /> Captured
                      </div>
                    ) : (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Scanning…
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[13px] font-bold">Look at the camera and slowly turn your head</p>

                <button
                  type="button"
                  onClick={() => { setUploadTarget('liveness'); fileInputRef.current?.click(); }}
                  className="w-full rounded-full border border-border bg-background py-3 text-[13px] font-bold transition hover:bg-muted"
                >
                  {uploading && uploadTarget === 'liveness' ? (
                    <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Uploading…</span>
                  ) : livenessMedia ? (
                    <span className="inline-flex items-center gap-2"><Video size={14} /> Replace selfie video</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Camera size={14} /> Capture selfie video</span>
                  )}
                </button>

                <button
                  onClick={submitClaim}
                  disabled={!livenessMedia || submitting}
                  className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="inline-flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Submitting…</span>
                  ) : 'Done'}
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background">
                    <Check size={32} strokeWidth={3} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[20px] font-black text-primary">Verification Submitted</h3>
                  <p className="text-[12px] text-muted-foreground px-4">
                    Once approved, we'll send the login credentials to{' '}
                    <span className="font-bold text-foreground">{email || 'your email'}</span>.
                    It usually takes up to 24-48 hours.
                  </p>
                </div>
                <button
                  onClick={close}
                  className="w-full rounded-full bg-foreground py-3.5 text-[14px] font-bold text-background transition hover:opacity-90"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file input shared across upload targets */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={uploadTarget === 'liveness' ? 'video/*' : 'image/*,.pdf'}
            capture={uploadTarget === 'liveness' ? 'user' : undefined}
            onChange={handleFile}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
