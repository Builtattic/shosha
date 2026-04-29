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
    
    if (!targetAccountId) return;
    if (!type) return;
    
    if (description.length < 10) {
      toast.push('Description needs at least 10 characters.');
      return;
    }

    if (!media) {
      toast.push('Upload photo or video evidence first.');
      return;
    }

    if (!aiConsent) {
      toast.push('Please confirm the AI Undertaking.');
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
          feelings: feelings || description,
          media: { url: media.url, type: media.type, bytes: media.bytes },
          location: location || undefined,
          tags: taggedPerson ? [taggedPerson] : []
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

        <div className="space-y-8 pb-12">
          {/* Step 1: Who */}
          {!accountId && (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-border bg-card/50 p-5 shadow-sm">
                <h3 className="text-[17px] font-bold mb-1">Who is this report about?</h3>
                <p className="text-[13px] text-muted-foreground mb-4">We will create or reuse the public dossier behind this filing.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {(['instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin'] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setTargetPlatform(platform);
                        setResolvedAccountId(null);
                      }}
                      className={cn(
                        'rounded-full border py-2.5 text-[12px] font-bold transition-all active:scale-95',
                        targetPlatform === platform
                          ? 'border-foreground bg-foreground text-background shadow-md'
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                      )}
                    >
                      {platform === 'x' ? 'X' : platform[0].toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="relative">
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
                    className="w-full rounded-full border border-border bg-background px-5 py-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                  {searchingCandidates && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>

                {targetSourceUrl ? (
                  <div className="mt-4 rounded-[20px] border border-primary/30 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold flex items-center gap-1.5">
                          {targetDisplayName}
                          {targetVerified && <ShieldCheck size={14} className="text-primary shrink-0" />}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {targetPlatform === 'x' ? 'X' : targetPlatform} / @{targetHandle}
                          {targetFollowers ? ` · ${targetFollowers}` : ''}
                        </p>
                        <a
                          href={targetSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-block truncate text-[11px] text-primary hover:underline font-medium"
                        >
                          View Profile
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
                        className="shrink-0 rounded-full bg-muted px-4 py-1.5 text-[11px] font-bold hover:bg-muted/80 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 empty:hidden space-y-2">
                    {candidates.slice(0, 4).map((candidate) => (
                      <button
                        key={`${candidate.platform}:${candidate.username}:${candidate.sourceUrl}`}
                        type="button"
                        onClick={() => pickCandidate(candidate)}
                        className="w-full rounded-[18px] border border-border bg-background p-3.5 text-left transition hover:bg-muted/50 hover:border-foreground/20 group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold group-hover:text-primary transition-colors">{candidate.displayName}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {candidate.platform === 'x' ? 'X' : candidate.platform} / @{candidate.username}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                            {Math.round(candidate.confidence * 100)}% Match
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Impact Type */}
          <section className="space-y-4">
            <div>
              <h3 className="text-[17px] font-bold mb-1">What type of impact is this?</h3>
              <p className="text-[13px] text-muted-foreground">Help us understand the nature of this report.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setType('positive')}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-[24px] border p-5 transition-all text-left group',
                  type === 'positive' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'
                )}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-transform group-active:scale-90', type === 'positive' ? 'bg-primary text-background' : 'bg-primary/10 text-primary')}>
                  <Heart size={22} fill={type === 'positive' ? 'currentColor' : 'none'} />
                </div>
                <div>
                  <div className={cn('text-[15px] font-bold', type === 'positive' ? 'text-primary' : 'text-foreground')}>Positive Impact</div>
                  <div className="text-[12px] text-muted-foreground">Someone did good</div>
                </div>
              </button>

              <button
                onClick={() => setType('negative')}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-[24px] border p-5 transition-all text-left group',
                  type === 'negative' ? 'border-destructive bg-destructive/5 shadow-sm' : 'border-border bg-card hover:border-destructive/30'
                )}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-transform group-active:scale-90', type === 'negative' ? 'bg-destructive text-background' : 'bg-destructive/10 text-destructive')}>
                  <AlertTriangle size={22} fill={type === 'negative' ? 'currentColor' : 'none'} />
                </div>
                <div>
                  <div className={cn('text-[15px] font-bold', type === 'negative' ? 'text-destructive' : 'text-foreground')}>Negative Impact</div>
                  <div className="text-[12px] text-muted-foreground">Harmful or unethical</div>
                </div>
              </button>
            </div>
          </section>

          {/* Description */}
          <section className="space-y-4">
            <div>
              <h3 className="text-[17px] font-bold mb-1">Tell us what happened</h3>
              <p className="text-[13px] text-muted-foreground">Be clear, specific and honest.</p>
            </div>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a detailed description of the impact..."
                className="w-full min-h-[140px] rounded-[24px] border border-border bg-card p-5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-shadow"
              />
              <div className="absolute bottom-4 right-5 text-[11px] font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {description.length}/500
              </div>
            </div>
          </section>

          {/* EVIDENCE - COMPULSORY */}
          <section className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold mb-1">Add Proof</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Required</span>
              </div>
              <p className="text-[13px] text-muted-foreground">Upload a photo or video as evidence. This is compulsory.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />

            {media ? (
              <div className="rounded-[24px] border border-border bg-card p-4 group relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  {media.type === 'video' ? <Video size={14} className="text-primary" /> : <ImageIcon size={14} className="text-primary" />}
                  Evidence Uploaded · {(media.bytes / (1024 * 1024)).toFixed(2)} MB
                </p>
                <div className="relative rounded-[16px] overflow-hidden bg-muted">
                  {media.type === 'video' ? (
                    <video src={media.url} controls className="w-full max-h-72 object-contain" />
                  ) : (
                    <img src={media.url} alt="evidence" className="w-full max-h-72 object-contain mx-auto" />
                  )}
                  <button
                    onClick={() => setMedia(null)}
                    className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-full rounded-[24px] border-2 border-dashed p-8 text-center transition-all duration-300 active:scale-[0.98]",
                  uploading ? "bg-muted border-border" : "bg-card border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                )}
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-full transition-colors", uploading ? "bg-muted-foreground/10" : "bg-primary/5 text-primary")}>
                    {uploading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Plus size={32} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[15px] font-bold text-foreground">{uploading ? 'Uploading Evidence...' : 'Upload Evidence'}</span>
                    <span className="block text-[12px] text-muted-foreground">Photos or Videos up to 50MB</span>
                  </div>
                </div>
              </button>
            )}
          </section>

          {/* AI Undertaking */}
          <section className="rounded-[24px] bg-primary/5 p-5 border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-[15px] font-bold text-foreground">AI Undertaking</h3>
            </div>
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                  className="peer h-5 w-5 rounded-md border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <span className="block text-[13px] font-medium text-foreground/90 leading-snug group-hover:text-foreground transition-colors">
                  I confirm that this content is not AI-made or fabricated and is shared in good faith.
                </span>
                <span className="block text-[11px] text-muted-foreground/70 italic">
                  False or misleading reports may lead to permanent platform ban.
                </span>
              </div>
            </label>
          </section>

          {/* Optional Details */}
          <section className="space-y-6">
            <div>
              <h3 className="text-[16px] font-bold mb-4 flex items-center justify-between">
                Additional Details <span className="text-[11px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
              </h3>
              
              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    value={taggedPerson}
                    onChange={(e) => setTaggedPerson(e.target.value)}
                    placeholder="Tag person(s) involved"
                    className="w-full rounded-full border border-border bg-card py-3.5 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where did this happen?"
                    className="w-full rounded-full border border-border bg-card py-3.5 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Submit Action */}
          <div className="sticky bottom-0 bg-background pt-4 border-t border-border mt-8">
            <button
              onClick={submit}
              disabled={submitting || uploading || !type || description.length < 10 || !media || (!accountId && !targetSourceUrl)}
              className={cn(
                "w-full rounded-full py-4.5 text-[16px] font-bold transition-all active:scale-[0.98] shadow-lg",
                (submitting || uploading || !type || description.length < 10 || !media || (!accountId && !targetSourceUrl))
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70 shadow-none"
                  : "bg-foreground text-background hover:bg-foreground/90 hover:shadow-xl"
              )}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  <span>Submitting Filing...</span>
                </div>
              ) : !media ? (
                'Upload Evidence to Submit'
              ) : (
                'Submit Report'
              )}
            </button>
            <p className="text-center text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck size={12} className="text-primary" />
              Your identity will remain 100% anonymous
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
