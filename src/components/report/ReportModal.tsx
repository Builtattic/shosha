'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Heart,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type UploadedMedia = {
  url: string;
  type: 'image' | 'video';
  bytes: number;
};

type Platform = 'instagram' | 'x' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'website';

type AccountCandidate = {
  platform: Platform;
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  confidence: number;
  reason: string;
};

export function ReportModal({
  open,
  accountId,
  onClose,
  onSubmitted
}: {
  open: boolean;
  accountId?: string;
  onClose: () => void;
  onSubmitted?: (accountId: string) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'positive' | 'negative' | null>(null);
  const [description, setDescription] = useState('');
  const [feelings, setFeelings] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [taggedPerson, setTaggedPerson] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<Platform>('instagram');
  const [targetHandle, setTargetHandle] = useState('');
  const [targetDisplayName, setTargetDisplayName] = useState('');
  const [targetSourceUrl, setTargetSourceUrl] = useState('');
  const [targetBio, setTargetBio] = useState('');
  const [targetFollowers, setTargetFollowers] = useState('');
  const [targetVerified, setTargetVerified] = useState(false);
  const [candidates, setCandidates] = useState<AccountCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep(1);
    setType(null);
    setDescription('');
    setFeelings('');
    setAiConsent(false);
    setTaggedPerson('');
    setTargetPlatform('instagram');
    setTargetHandle('');
    setTargetDisplayName('');
    setTargetSourceUrl('');
    setTargetBio('');
    setTargetFollowers('');
    setTargetVerified(false);
    setCandidates([]);
    setSearchingCandidates(false);
    setResolvedAccountId(null);
    setLocation('');
    setMedia(null);
    setUploading(false);
    setSubmitting(false);
  }

  useEffect(() => {
    if (!open || accountId || targetHandle.trim().length < 2) {
      setCandidates([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(targetHandle)}&discover=1`);
        const payload = await response.json();
        if (payload.ok) setCandidates(payload.data.candidates ?? []);
      } catch {
        setCandidates([]);
      } finally {
        setSearchingCandidates(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [accountId, open, targetHandle]);

  function pickCandidate(candidate: AccountCandidate) {
    setTargetPlatform(candidate.platform);
    setTargetHandle(candidate.username);
    setTargetDisplayName(candidate.displayName);
    setTargetSourceUrl(candidate.sourceUrl);
    setTargetBio(candidate.bio);
    setTargetFollowers(candidate.followers ?? '');
    setTargetVerified(Boolean(candidate.verified));
    setResolvedAccountId(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) {
      toast.push('Sign in before uploading evidence.');
      router.push('/sign-in');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/media/upload', { method: 'POST', body: form });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Upload failed.');
      setMedia({ url: payload.data.url, type: payload.data.type, bytes: payload.data.bytes });
      toast.push('Evidence uploaded.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function ensureAccount() {
    if (accountId) return accountId;
    if (resolvedAccountId) return resolvedAccountId;
    if (!user) {
      toast.push('Sign in before opening a dossier.');
      router.push('/sign-in');
      return null;
    }
    const username = targetHandle.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-zA-Z0-9_.-]{2,100}$/.test(username)) {
      toast.push('Enter a valid target username first.');
      setStep(1);
      return null;
    }

    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: targetPlatform,
        username,
        displayName: targetDisplayName || undefined,
        sourceUrl: targetSourceUrl || undefined,
        bio: targetBio || undefined,
        followers: targetFollowers || undefined,
        verified: targetVerified || undefined
      })
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not open target dossier.');
    setResolvedAccountId(payload.data._id);
    return payload.data._id as string;
  }

  async function submit() {
    let targetAccountId: string | null = null;
    try {
      targetAccountId = await ensureAccount();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not open target dossier.');
      return;
    }
    if (!targetAccountId) {
      return;
    }
    if (!type) return;
    if (description.length < 10) {
      toast.push('Description needs at least 10 characters.');
      return;
    }
    const feelingsValue = feelings.length >= 10 ? feelings : description;
    if (!media) {
      toast.push('Upload a photo or video as evidence first.');
      return;
    }
    if (!aiConsent) {
      toast.push('Confirm the AI undertaking before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          accountId: targetAccountId,
          type,
          description,
          feelings: feelingsValue,
          media: { url: media.url, type: media.type, bytes: media.bytes }
        })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Submission failed.');
      toast.push('Filing entered into the queue.');
      onSubmitted?.(targetAccountId);
      router.refresh();
      close();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-background border-x border-t border-border p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => (step > 1 ? setStep(step - 1) : close())} className="text-muted-foreground">
            {step > 1 ? <ChevronLeft size={24} /> : <X size={24} />}
          </button>
          <h2 className="text-[18px] font-bold">Create Report</h2>
          <div className="w-6" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                {!accountId && (
                  <div className="mb-6 rounded-[20px] border border-border bg-card p-4">
                    <h3 className="text-[16px] font-bold mb-1">Who is this report about?</h3>
                    <p className="text-[13px] text-muted-foreground mb-4">We will create or reuse the public dossier behind this filing.</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(['instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin'] as const).map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => {
                            setTargetPlatform(platform);
                            setResolvedAccountId(null);
                          }}
                          className={cn(
                            'rounded-full border py-2 text-[12px] font-bold transition',
                            targetPlatform === platform
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background text-muted-foreground'
                          )}
                        >
                          {platform === 'x' ? 'X' : platform[0].toUpperCase() + platform.slice(1)}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={targetHandle}
                      onChange={(event) => {
                        setTargetHandle(event.target.value);
                        setTargetDisplayName('');
                        setTargetSourceUrl('');
                        setTargetBio('');
                        setTargetFollowers('');
                        setTargetVerified(false);
                        setResolvedAccountId(null);
                      }}
                      placeholder="Search name, brand, or @username"
                      className="w-full rounded-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {targetSourceUrl ? (
                      <div className="mt-3 rounded-[14px] border border-primary bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold flex items-center gap-1">
                              {targetDisplayName}
                              {targetVerified && <ShieldCheck size={12} className="text-primary shrink-0" />}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {targetPlatform === 'x' ? 'X' : targetPlatform} / @{targetHandle}
                              {targetFollowers ? ` · ${targetFollowers}` : ''}
                            </p>
                            <a
                              href={targetSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block truncate text-[10px] text-primary underline"
                            >
                              {targetSourceUrl}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSourceUrl('');
                              setTargetDisplayName('');
                              setTargetBio('');
                              setTargetFollowers('');
                              setTargetVerified(false);
                              setResolvedAccountId(null);
                            }}
                            className="shrink-0 rounded-full border border-border px-3 py-1 text-[10px] font-bold"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(searchingCandidates || candidates.length > 0 || targetHandle.trim().length >= 2) && (
                          <div className="mt-3 space-y-2">
                            {searchingCandidates && (
                              <p className="text-[11px] text-muted-foreground">Searching public profiles with Gemini...</p>
                            )}
                            {!searchingCandidates && candidates.length === 0 && targetHandle.trim().length >= 2 && (
                              <p className="text-[11px] text-destructive">
                                No real accounts found for &ldquo;{targetHandle}&rdquo;. Try a more specific name or different handle.
                              </p>
                            )}
                            {candidates.slice(0, 6).map((candidate) => (
                              <button
                                key={`${candidate.platform}:${candidate.username}:${candidate.sourceUrl}`}
                                type="button"
                                onClick={() => pickCandidate(candidate)}
                                className="w-full rounded-[14px] border border-border bg-background p-3 text-left transition hover:bg-muted"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-bold">{candidate.displayName}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {candidate.platform === 'x' ? 'X' : candidate.platform} / @{candidate.username}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-foreground px-2 py-1 text-[10px] font-bold text-background">
                                    {Math.round(candidate.confidence * 100)}%
                                  </span>
                                </div>
                                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{candidate.reason}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <h3 className="text-[16px] font-bold mb-1">What type of impact is this?</h3>
                <p className="text-[13px] text-muted-foreground mb-4">Help us understand the nature of this report.</p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setType('positive')}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-[20px] border p-4 transition-all text-left',
                      type === 'positive' ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', type === 'positive' ? 'bg-primary text-background' : 'bg-primary/10 text-primary')}>
                      <Heart size={20} fill={type === 'positive' ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <div className={cn('text-[14px] font-bold', type === 'positive' ? 'text-primary' : 'text-foreground')}>Positive Impact</div>
                      <div className="text-[11px] text-muted-foreground">Someone did good</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setType('negative')}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-[20px] border p-4 transition-all text-left',
                      type === 'negative' ? 'border-destructive bg-destructive/5' : 'border-border bg-card'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', type === 'negative' ? 'bg-destructive text-background' : 'bg-destructive/10 text-destructive')}>
                      <AlertTriangle size={20} fill={type === 'negative' ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <div className={cn('text-[14px] font-bold', type === 'negative' ? 'text-destructive' : 'text-foreground')}>Negative Impact</div>
                      <div className="text-[11px] text-muted-foreground">Harmful or unethical</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-bold mb-1">Tell us what happened</h3>
                <p className="text-[13px] text-muted-foreground mb-4">Be clear, specific and honest.</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a detailed description of the impact..."
                  className="w-full min-h-[120px] rounded-[16px] border border-border bg-card p-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="text-right text-[11px] text-muted-foreground mt-1">{description.length}/500</div>
              </div>

              <div>
                <h3 className="text-[16px] font-bold mb-1">How did this feel?</h3>
                <p className="text-[13px] text-muted-foreground mb-4">A short note for the tribunal.</p>
                <textarea
                  value={feelings}
                  onChange={(e) => setFeelings(e.target.value)}
                  placeholder="Optional — defaults to your description if blank."
                  className="w-full min-h-[80px] rounded-[16px] border border-border bg-card p-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!type || description.length < 10 || (!accountId && !targetSourceUrl)}
                className="w-full rounded-full bg-foreground py-4 text-[16px] font-bold text-background disabled:opacity-50"
              >
                {!accountId && !targetSourceUrl && targetHandle.trim().length >= 2
                  ? 'Pick a real account above to continue'
                  : 'Continue'}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h3 className="text-[16px] font-bold mb-1">Add Proof</h3>
                <p className="text-[13px] text-muted-foreground mb-4">Upload an image or video as evidence.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFile}
                />

                {media ? (
                  <div className="rounded-[16px] border border-border bg-card p-3">
                    <p className="text-xs uppercase text-muted-foreground mb-2 flex items-center gap-2">
                      {media.type === 'video' ? <Video size={14} /> : <ImageIcon size={14} />}
                      Uploaded · {(media.bytes / 1024).toFixed(1)} KB
                    </p>
                    {media.type === 'video' ? (
                      <video src={media.url} controls className="w-full rounded-[12px] max-h-60" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media.url} alt="evidence" className="w-full rounded-[12px] max-h-60 object-contain" />
                    )}
                    <button
                      onClick={() => setMedia(null)}
                      className="mt-2 text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full rounded-[16px] border border-dashed border-border bg-card p-6 text-center transition hover:bg-muted disabled:opacity-50"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Plus size={24} />
                      <span className="text-[12px] font-bold">{uploading ? 'Uploading…' : 'Add photo or video'}</span>
                    </div>
                  </button>
                )}
              </div>

              <div className="rounded-[16px] bg-muted/30 p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck size={20} className="text-primary" />
                  <h3 className="text-[14px] font-bold text-foreground">AI Undertaking</h3>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiConsent}
                    onChange={(e) => setAiConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-[12px] text-muted-foreground leading-tight">
                    I confirm that this content is not AI-made or fabricated and is shared in good faith.
                    <span className="block mt-1 text-[10px] opacity-70 italic">False or misleading reports may lead to action.</span>
                  </span>
                </label>
              </div>

              <div>
                <h3 className="text-[16px] font-bold mb-4">
                  Tag the person(s) involved <span className="text-muted-foreground font-normal">(Optional)</span>
                </h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={taggedPerson}
                    onChange={(e) => setTaggedPerson(e.target.value)}
                    placeholder="Search by name or @username"
                    className="w-full rounded-full border border-border bg-card py-3 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-bold mb-4">
                  Location <span className="text-muted-foreground font-normal">(Optional)</span>
                </h3>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where did this happen?"
                    className="w-full rounded-full border border-border bg-card py-3 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={submitting || uploading}
                className="w-full rounded-full bg-foreground py-4 text-[16px] font-bold text-background disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">🔒 Your identity will remain anonymous</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
