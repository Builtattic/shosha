'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CIRCUMSTANCES_LABELS, SHEET_SCORING_INDEX } from '@/lib/scoring';
import type { AccountRecord } from '@/lib/repos/accounts';

type UploadedMedia = {
  url: string;
  type: 'image' | 'video';
  bytes: number;
};

type Platform = 'instagram' | 'x' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin' | 'reddit' | 'snapchat' | 'website';

type AccountCandidate = {
  platform: Platform;
  username: string;
  displayName: string;
  sourceUrl: string;
  bio: string;
  followers?: string;
  verified?: boolean;
  avatarUrl?: string;
  confidence: number;
  reason: string;
  existingAccountId?: string;
};

type AdditionalSocialLinkRow = { platform: Platform; url: string };

type ApiPayload<T = unknown> = {
  ok?: boolean;
  data?: T;
  error?: { message?: string };
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function generateUsername(name: string) {
  if (!name) return '';
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/(^\.|\.$)/g, '');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${clean}.${num}`;
}

async function readApiPayload<T>(response: Response, fallbackMessage: string): Promise<ApiPayload<T>> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(fallbackMessage);
  }

  try {
    return JSON.parse(text) as ApiPayload<T>;
  } catch {
    const message = text.trim().startsWith('<') ? fallbackMessage : text.trim().slice(0, 240);
    throw new Error(message || fallbackMessage);
  }
}

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
  const [repetitionPattern, setRepetitionPattern] = useState<string>('0.5');
  const [intent, setIntent] = useState<string>('0.5');
  const [circumstances, setCircumstances] = useState<string>('1');
  const [category, setCategory] = useState('');
  const [deed, setDeed] = useState('');
  const [description, setDescription] = useState('');
  const [feelings, setFeelings] = useState('');
  const [evidenceSourceUrl, setEvidenceSourceUrl] = useState('');
  const [aiConsent, setAiConsent] = useState(false);
  const [taggedPerson, setTaggedPerson] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<Platform>('instagram');
  const [targetHandle, setTargetHandle] = useState('');
  const [targetDisplayName, setTargetDisplayName] = useState('');
  const [targetSourceUrl, setTargetSourceUrl] = useState('');
  const [targetBio, setTargetBio] = useState('');
  const [targetFollowers, setTargetFollowers] = useState('');
  const [targetVerified, setTargetVerified] = useState(false);
  const [targetManual, setTargetManual] = useState(false);
  const [candidates, setCandidates] = useState<AccountCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const deedOptions = useMemo(
    () => SHEET_SCORING_INDEX.filter((row) => !type || row.type === type),
    [type]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(deedOptions.map((row) => row.category))),
    [deedOptions]
  );
  const filteredDeeds = useMemo(
    () => deedOptions.filter((row) => !category || row.category === category),
    [category, deedOptions]
  );
  const selectedScoringRow = deedOptions.find((row) => row.category === category && row.deed === deed) ?? null;

  // New Profile State
  const [view, setView] = useState<'report' | 'add_profile'>('report');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileEmail, setNewProfileEmail] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [addProfileStep, setAddProfileStep] = useState<1 | 2>(1);
  const [additionalSocialLinks, setAdditionalSocialLinks] = useState<AdditionalSocialLinkRow[]>([]);
  const [extraLinkPlatform, setExtraLinkPlatform] = useState<Platform>('instagram');
  const [extraLinkUrl, setExtraLinkUrl] = useState('');

  useEffect(() => {
    if (newProfileName && !newProfileUsername) {
      setNewProfileUsername(generateUsername(newProfileName));
    }
  }, [newProfileName, newProfileUsername]);

  function reset() {
    setStep(1);
    setType(null);
    setCategory('');
    setDeed('');
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
    setTargetManual(false);
    setCandidates([]);
    setSearchingCandidates(false);
    setResolvedAccountId(null);
    setLocation('');
    setCircumstances('1');
    setMedia(null);
    setUploading(false);
    setSubmitting(false);
    setSubmitError('');
    setView('report');
    setNewProfileName('');
    setNewProfileEmail('');
    setNewProfileUrl('');
    setNewProfileUsername('');
    setAddProfileStep(1);
    setAdditionalSocialLinks([]);
    setExtraLinkPlatform('instagram');
    setExtraLinkUrl('');
  }

  useEffect(() => {
    if (!open || accountId || targetHandle.trim().length < 2) {
      setCandidates([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(targetHandle)}&discover=0`);
        const payload = await readApiPayload<{ candidates?: AccountCandidate[]; accounts?: AccountRecord[] }>(
          response,
          'Search failed.'
        );
        if (!payload.ok || !payload.data) {
          setCandidates([]);
          return;
        }
        const rtdbAccounts = (payload.data.accounts ?? []).map((acc: AccountRecord) => ({
          platform: acc.platform,
          username: acc.username,
          displayName: acc.displayName,
          bio: acc.bio,
          avatarUrl: acc.avatarUrl,
          followers: acc.followers,
          verified: acc.verified,
          sourceUrl: acc.socialLinks?.[acc.platform]?.url ?? '',
          confidence: 1,
          reason: 'In directory',
          existingAccountId: acc._id
        }));
        setCandidates([...rtdbAccounts, ...(payload.data.candidates ?? [])]);
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
    setTargetManual(false);
    if (candidate.existingAccountId) setResolvedAccountId(candidate.existingAccountId);
    else setResolvedAccountId(null);
  }

  useEffect(() => {
    if (!type) {
      setCategory('');
      setDeed('');
      return;
    }
    const first = SHEET_SCORING_INDEX.find((row) => row.type === type);
    if (first && (!selectedScoringRow || selectedScoringRow.type !== type)) {
      setCategory(first.category);
      setDeed(first.deed);
    }
  }, [selectedScoringRow, type]);

  function close() {
    reset();
    onClose();
  }

  // Body scroll lock + Escape close while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !uploading) close();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting, uploading]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/media/upload', { method: 'POST', body: form });
      const payload = await readApiPayload<UploadedMedia>(response, 'Upload failed.');
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Upload failed.');
      if (!payload.data) throw new Error('Upload failed.');
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
        skipDiscovery: targetManual || undefined,
        bio: targetBio || undefined,
        followers: targetFollowers || undefined,
        verified: targetVerified || undefined,
        email: newProfileEmail.trim() || undefined,
        socialUrl: newProfileUrl.trim() ? normalizeUrl(newProfileUrl) : undefined,
        additionalSocialLinks: additionalSocialLinks.length ? additionalSocialLinks : undefined
      })
    });
    const payload = await readApiPayload<{ _id: string }>(response, 'Could not open target dossier.');
    if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not open target dossier.');
    if (!payload.data?._id) throw new Error('Could not open target dossier.');
    setResolvedAccountId(payload.data._id);
    return payload.data._id as string;
  }

  async function submit() {
    function showSubmitError(message: string) {
      setSubmitError(message);
      toast.push(message);
    }

    if (!type) {
      showSubmitError('Choose positive or negative impact before submitting.');
      return;
    }

    if (description.length < 10) {
      showSubmitError('Description needs at least 10 characters.');
      return;
    }

    if (!media) {
      showSubmitError('Upload photo or video evidence first.');
      return;
    }

    if (!aiConsent) {
      showSubmitError('Please confirm the AI Undertaking.');
      return;
    }

    if (!accountId && !targetHandle.trim()) {
      showSubmitError('Select or add the profile this report is about.');
      return;
    }

    if (!selectedScoringRow) {
      showSubmitError('Choose a valid workbook deed for this report.');
      return;
    }

    setSubmitError('');
    setSubmitting(true);
    let targetAccountId: string | null = null;
    try {
      targetAccountId = await ensureAccount();
    } catch (error) {
      showSubmitError(error instanceof Error ? error.message : 'Could not open target dossier.');
      setSubmitting(false);
      return;
    }
    
    if (!targetAccountId) {
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: targetAccountId,
          type,
          category: selectedScoringRow.category,
          deed: selectedScoringRow.deed,
          baseScore: selectedScoringRow.baseScore,
          description,
          feelings: feelings || description,
          media: { url: media.url, type: media.type, bytes: media.bytes },
          location: location || undefined,
          tags: taggedPerson ? [taggedPerson] : [],
          repetitionPattern,
          intent,
          circumstances,
          aiUndertaking: aiConsent
        })
      });
      const payload = await readApiPayload(response, 'Submission failed. Please try again.');
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Submission failed.');
      toast.push('Filing entered into the queue.');
      onSubmitted?.(targetAccountId);
      router.refresh();
      close();
    } catch (error) {
      showSubmitError(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="report-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting && !uploading) close();
          }}
        >
          <motion.div
            key="report-modal-card"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="max-h-[92dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-t-3xl border-x border-t border-border bg-background p-3 shadow-2xl no-scrollbar overscroll-contain sm:rounded-3xl sm:p-6"
          >
        <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-4 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:mb-6 sm:px-6 sm:py-4">
          <button
            onClick={() => {
              if (view === 'add_profile' && addProfileStep === 2) {
                setAddProfileStep(1);
                return;
              }
              if (view === 'add_profile') {
                setView('report');
                return;
              }
              if (step > 1) setStep(step - 1);
              else close();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={view === 'add_profile' || step > 1 ? 'Back' : 'Close'}
          >
            {view === 'add_profile' || step > 1 ? <ChevronLeft size={22} /> : <X size={22} />}
          </button>
          <h2 className="min-w-0 flex-1 truncate text-center text-[16px] font-black sm:text-[18px]">
            {view === 'add_profile'
              ? addProfileStep === 2
                ? 'Social handles (optional)'
                : 'Add Profile'
              : 'Create Report'}
          </h2>
          <div className="h-9 w-9 shrink-0" />
        </div>

        {view === 'add_profile' ? (
          <div className="space-y-6 pb-6">
            {addProfileStep === 1 ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-bold">Full Name</label>
                    <Input
                      value={newProfileName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProfileName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="mt-1.5 bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold">Email / Contact (Optional)</label>
                    <Input
                      value={newProfileEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProfileEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1.5 bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold">Link to Social Media (Optional)</label>
                    <Input
                      value={newProfileUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProfileUrl(e.target.value)}
                      placeholder="https://instagram.com/johndoe"
                      className="mt-1.5 bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold">System Generated Username</label>
                    <Input
                      value={newProfileUsername}
                      readOnly
                      className="mt-1.5 bg-muted/50 text-muted-foreground font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      This handle is automatically assigned and cannot be changed here.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1 rounded-2xl py-6" onClick={() => setView('report')}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-2xl bg-foreground py-6 text-background hover:bg-foreground/90"
                    disabled={!newProfileName.trim() || !newProfileUsername.trim() || submitting}
                    onClick={() => setAddProfileStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-muted-foreground">
                  Add their social media handles (optional). You can skip this and add links later.
                </p>
                <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
                  <div>
                    <label className="text-[13px] font-bold">Platform</label>
                    <select
                      value={extraLinkPlatform}
                      onChange={(e) => setExtraLinkPlatform(e.target.value as Platform)}
                      className="mt-1.5 w-full rounded-[12px] border border-border bg-background p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="x">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-bold">Handle or URL</label>
                    <Input
                      value={extraLinkUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtraLinkUrl(e.target.value)}
                      placeholder="@handle or full profile URL"
                      className="mt-1.5 bg-background border-border"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-xl"
                    disabled={!extraLinkUrl.trim()}
                    onClick={() => {
                      const u = extraLinkUrl.trim();
                      if (!u) return;
                      setAdditionalSocialLinks((prev) => [...prev, { platform: extraLinkPlatform, url: u }]);
                      setExtraLinkUrl('');
                    }}
                  >
                    Add link
                  </Button>
                </div>
                {additionalSocialLinks.length > 0 && (
                  <ul className="space-y-2 text-[13px]">
                    {additionalSocialLinks.map((row, i) => (
                      <li
                        key={`${row.platform}-${i}-${row.url}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {row.platform === 'x' ? 'X' : row.platform} · {row.url}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-[12px] font-bold text-destructive hover:underline"
                          onClick={() => setAdditionalSocialLinks((prev) => prev.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-2xl py-6"
                    onClick={() => {
                      const sourceUrl = normalizeUrl(newProfileUrl);
                      const candidate: AccountCandidate = {
                        platform: sourceUrl ? targetPlatform : 'website',
                        username: newProfileUsername,
                        displayName: newProfileName.trim(),
                        sourceUrl: sourceUrl || '',
                        bio: '',
                        verified: false,
                        confidence: 1,
                        reason: 'Manually added profile'
                      };
                      pickCandidate(candidate);
                      setTargetManual(!sourceUrl);
                      setAddProfileStep(1);
                      setView('report');
                    }}
                  >
                    Skip
                  </Button>
                  <Button
                    className="flex-1 rounded-2xl bg-foreground py-6 text-background hover:bg-foreground/90"
                    onClick={() => {
                      const sourceUrl = normalizeUrl(newProfileUrl);
                      const candidate: AccountCandidate = {
                        platform: sourceUrl ? targetPlatform : 'website',
                        username: newProfileUsername,
                        displayName: newProfileName.trim(),
                        sourceUrl: sourceUrl || '',
                        bio: '',
                        verified: false,
                        confidence: 1,
                        reason: 'Manually added profile'
                      };
                      pickCandidate(candidate);
                      setTargetManual(!sourceUrl);
                      setAddProfileStep(1);
                      setView('report');
                    }}
                  >
                    Continue to report
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
          {/* Step 1: Who */}
          {!accountId && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-border bg-card/50 p-4 shadow-sm sm:p-5">
                <h3 className="text-[15px] font-bold mb-1 sm:text-[17px]">Who is this report about?</h3>
                <p className="text-[12px] text-muted-foreground mb-3 sm:text-[13px] sm:mb-4">We will create or reuse the public dossier behind this filing.</p>
                <div className="grid grid-cols-2 gap-1.5 mb-3 sm:grid-cols-4 sm:gap-2 sm:mb-4">
                  {(['instagram', 'facebook', 'x', 'youtube', 'tiktok', 'linkedin', 'reddit', 'snapchat'] as const).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setTargetPlatform(platform);
                        setTargetManual(false);
                        setResolvedAccountId(null);
                      }}
                      className={cn(
                        'truncate rounded-full border px-2 py-2 text-[11px] font-bold transition-all active:scale-95 sm:py-2.5 sm:text-[12px]',
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
                      setTargetManual(false);
                      setResolvedAccountId(null);
                    }}
                    placeholder="Search name, brand, or @username"
                    className="w-full rounded-full border border-border bg-background px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow sm:px-5 sm:py-4 sm:text-[14px]"
                  />
                  {searchingCandidates && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>

                {targetDisplayName || targetSourceUrl ? (
                  <div className="mt-4 rounded-[20px] border border-primary/30 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold flex items-center gap-1.5">
                          {targetDisplayName}
                          {targetVerified && <ShieldCheck size={14} className="text-primary shrink-0" />}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {targetManual ? 'Internal profile' : targetPlatform === 'x' ? 'X' : targetPlatform} / @{targetHandle}
                          {targetFollowers ? ` · ${targetFollowers}` : ''}
                        </p>
                        {targetSourceUrl ? (
                          <a
                            href={targetSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-block truncate text-[11px] text-primary hover:underline font-medium"
                          >
                            View Profile
                          </a>
                        ) : (
                          <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                            Social link can be added later
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSourceUrl('');
                          setTargetDisplayName('');
                          setTargetBio('');
                          setTargetFollowers('');
                          setTargetVerified(false);
                          setTargetManual(false);
                          setResolvedAccountId(null);
                        }}
                        className="shrink-0 rounded-full bg-muted px-4 py-1.5 text-[11px] font-bold hover:bg-muted/80 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {candidates.slice(0, 4).map((candidate) => (
                      <button
                        key={`${candidate.existingAccountId ?? ''}:${candidate.platform}:${candidate.username}:${candidate.sourceUrl}`}
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
                    
                    {targetHandle.trim().length > 1 && (
                      <div className="pt-2">
                        <div className="rounded-[18px] border border-border bg-muted/30 p-4 text-center">
                          <p className="text-[13px] font-medium mb-1">No exact match found?</p>
                          <p className="text-[11px] text-muted-foreground mb-3">They don&apos;t exist yet. Help us build the platform.</p>
                          <Button 
                            variant="secondary" 
                            className="w-full text-[13px]"
                            onClick={() => {
                              setAddProfileStep(1);
                              setAdditionalSocialLinks([]);
                              setExtraLinkPlatform('instagram');
                              setExtraLinkUrl('');
                              setView('add_profile');
                            }}
                          >
                            Add profile to the platform
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Impact Type */}
          <section className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-[15px] font-bold mb-1 sm:text-[17px]">What type of impact is this?</h3>
              <p className="text-[12px] text-muted-foreground sm:text-[13px]">Help us understand the nature of this report.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <motion.button
                onClick={() => setType('positive')}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors duration-200 group sm:gap-3 sm:p-5',
                  type === 'positive' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/30'
                )}
              >
                <motion.div
                  animate={type === 'positive' ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-11 sm:w-11', type === 'positive' ? 'bg-primary text-background' : 'bg-primary/10 text-primary')}
                >
                  <Heart size={18} fill={type === 'positive' ? 'currentColor' : 'none'} className="sm:h-[22px] sm:w-[22px]" />
                </motion.div>
                <div className="min-w-0">
                  <div className={cn('text-[13px] font-bold sm:text-[15px]', type === 'positive' ? 'text-primary' : 'text-foreground')}>Positive</div>
                  <div className="text-[11px] text-muted-foreground sm:text-[12px]">Someone did good</div>
                </div>
              </motion.button>

              <motion.button
                onClick={() => setType('negative')}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors duration-200 group sm:gap-3 sm:p-5',
                  type === 'negative' ? 'border-destructive bg-destructive/5 shadow-md' : 'border-border bg-card hover:border-destructive/30'
                )}
              >
                <motion.div
                  animate={type === 'negative' ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-11 sm:w-11', type === 'negative' ? 'bg-destructive text-background' : 'bg-destructive/10 text-destructive')}
                >
                  <AlertTriangle size={18} fill={type === 'negative' ? 'currentColor' : 'none'} className="sm:h-[22px] sm:w-[22px]" />
                </motion.div>
                <div className="min-w-0">
                  <div className={cn('text-[13px] font-bold sm:text-[15px]', type === 'negative' ? 'text-destructive' : 'text-foreground')}>Negative</div>
                  <div className="text-[11px] text-muted-foreground sm:text-[12px]">Harmful or unethical</div>
                </div>
              </motion.button>
            </div>
          </section>

          {/* Workbook deed */}
          {type && (
            <section className="space-y-4">
              <div>
                <h3 className="text-[17px] font-bold mb-1">Choose the workbook deed</h3>
                <p className="text-[13px] text-muted-foreground">This determines the base score before multipliers.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[13px] font-bold block mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const nextCategory = e.target.value;
                      const first = deedOptions.find((row) => row.category === nextCategory);
                      setCategory(nextCategory);
                      setDeed(first?.deed ?? '');
                    }}
                    className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-bold block mb-2">Deed</label>
                  <select
                    value={deed}
                    onChange={(e) => setDeed(e.target.value)}
                    className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {filteredDeeds.map((row) => (
                      <option key={`${row.category}:${row.deed}`} value={row.deed}>{row.deed}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedScoringRow && (
                <div className="rounded-[18px] border border-border bg-card p-4 text-[13px] font-bold">
                  Base score: <span className={selectedScoringRow.baseScore >= 0 ? 'text-primary' : 'text-destructive'}>
                    {selectedScoringRow.baseScore > 0 ? '+' : ''}{selectedScoringRow.baseScore}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Description */}
          <section className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-[15px] font-bold mb-1 sm:text-[17px]">Tell us what happened</h3>
              <p className="text-[12px] text-muted-foreground sm:text-[13px]">Be clear, specific and honest.</p>
            </div>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Write a detailed description of the impact..."
                className="min-h-[120px] w-full resize-none rounded-2xl border border-border bg-card p-4 pb-8 text-[14px] transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-[140px] sm:p-5 sm:text-[15px]"
              />
              <div className={cn(
                "absolute bottom-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm transition-colors sm:bottom-4 sm:right-4",
                description.length < 10 ? "bg-destructive/10 text-destructive" : description.length > 450 ? "bg-amber-100/80 text-amber-700" : "bg-background/80 text-muted-foreground"
              )}>
                {description.length}/500{description.length < 10 && ' · min 10'}
              </div>
            </div>
          </section>

          {/* EVIDENCE - COMPULSORY */}
          <section className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold mb-1 sm:text-[17px]">Add Proof</h3>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Required</span>
              </div>
              <p className="text-[12px] text-muted-foreground sm:text-[13px]">Upload a photo or video as evidence. This is compulsory.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />

            {media ? (
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 animate-in fade-in zoom-in-95 duration-300">
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
                  "w-full rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 active:scale-[0.98] sm:p-8",
                  uploading ? "bg-muted border-border" : "bg-card border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                )}
              >
                <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors sm:h-14 sm:w-14", uploading ? "bg-muted-foreground/10" : "bg-primary/5 text-primary")}>
                    {uploading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Plus size={26} className="sm:h-8 sm:w-8" />
                    )}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="block text-[14px] font-bold text-foreground sm:text-[15px]">{uploading ? 'Uploading Evidence...' : 'Upload Evidence'}</span>
                    <span className="block text-[11px] text-muted-foreground sm:text-[12px]">Photos or Videos up to 50MB</span>
                  </div>
                </div>
              </button>
            )}
          </section>

          {/* AI Undertaking */}
          <section className="rounded-2xl border border-primary/10 bg-primary/5 p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 mb-3 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-[14px] font-bold text-foreground sm:text-[15px]">AI Undertaking</h3>
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="peer mt-0.5 h-5 w-5 shrink-0 rounded-md border-border bg-background text-primary focus:ring-primary/20 transition-all cursor-pointer"
              />
              <div className="min-w-0 space-y-1">
                <span className="block text-[12px] font-medium text-foreground/90 leading-snug group-hover:text-foreground transition-colors sm:text-[13px]">
                  I confirm that this content is not AI-made or fabricated and is shared in good faith.
                </span>
                <span className="block text-[10px] text-muted-foreground/70 italic sm:text-[11px]">
                  False or misleading reports may lead to permanent platform ban.
                </span>
              </div>
            </label>
          </section>

          {/* Scoring Options */}
          <section className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-[15px] font-bold mb-1 sm:text-[17px]">Repetition & Intent</h3>
              <p className="text-[12px] text-muted-foreground sm:text-[13px]">Classify the pattern and intent of this incident.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <label className="text-[13px] font-bold block mb-2">Repetition Pattern (RP)</label>
                <select 
                  value={repetitionPattern} 
                  onChange={(e) => setRepetitionPattern(e.target.value)}
                  className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="0.5">No Clear Pattern</option>
                  <option value="1">Balanced</option>
                  <option value="1.5">Mixed Signals</option>
                  <option value="2">Leaning Off</option>
                  <option value="2.5">Pattern Forming</option>
                  <option value="3">Consistent Pattern</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-bold block mb-2">Intent (IN)</label>
                <select 
                  value={intent} 
                  onChange={(e) => setIntent(e.target.value)}
                  className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="0.5">Didn&apos;t mean to</option>
                  <option value="1">Not Aware</option>
                  <option value="1.5">Not Careful</option>
                  <option value="2">Meant to</option>
                  <option value="2.5">Thought Through</option>
                  <option value="3">Fully Planned</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-bold block mb-2">Circumstances (C)</label>
                <select
                  value={circumstances}
                  onChange={(e) => setCircumstances(e.target.value)}
                  className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(CIRCUMSTANCES_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Optional Details */}
          <section className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-[14px] font-bold mb-3 flex items-center justify-between gap-2 sm:text-[16px] sm:mb-4">
                <span className="truncate">Additional Details</span>
                <span className="shrink-0 text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider sm:text-[11px]">Optional</span>
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    value={taggedPerson}
                    onChange={(e) => setTaggedPerson(e.target.value)}
                    placeholder="Tag person(s) involved"
                    className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:py-3.5 sm:pl-12 sm:text-[14px]"
                  />
                </div>

                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where did this happen?"
                    className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:py-3.5 sm:pl-12 sm:text-[14px]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Submit Action */}
          <div className="sticky bottom-0 -mx-3 -mb-3 mt-6 border-t border-border bg-background/95 px-3 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:mt-8 sm:px-6 sm:pb-6 sm:pt-4">
            {submitError && (
              <p className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-[12px] font-medium text-destructive sm:px-4 sm:py-3 sm:text-[13px]">
                {submitError}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || uploading || !type || !selectedScoringRow || description.length < 10 || !media || (!accountId && !targetHandle.trim())}
              className={cn(
                "w-full rounded-full py-4 text-[15px] font-bold transition-all active:scale-[0.98] shadow-lg sm:text-[16px]",
                (submitting || uploading || !type || !selectedScoringRow || description.length < 10 || !media || (!accountId && !targetHandle.trim()))
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
            <p className="text-center text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5 font-medium sm:mt-3 sm:text-[11px]">
              <ShieldCheck size={11} className="text-primary shrink-0" />
              <span className="truncate">{user ? 'Reporter identity is hidden on public surfaces' : 'Anonymous filing uses a private hash'}</span>
            </p>
          </div>
        </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
