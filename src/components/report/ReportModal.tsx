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
  ChevronLeft,
  EyeOff,
  UserRound,
  Camera
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CIRCUMSTANCES_LABELS, SHEET_SCORING_INDEX } from '@/lib/scoring';
import type { AccountRecord } from '@/lib/repos/accounts';

type UploadedMedia = {
  url: string;
  thumbUrl?: string;
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

const CAMERA_IDEAL_WIDTH = 1280;
const CAMERA_IDEAL_HEIGHT = 720;
const CAMERA_JPEG_QUALITY = 0.92;

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
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isIRL, setIsIRL] = useState(false);
  const [aiConsent, setAiConsent] = useState(true);
  const [publicAnonymous, setPublicAnonymous] = useState(!user);
  const [taggedPerson, setTaggedPerson] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<AccountCandidate[]>([]);
  const [searchingTags, setSearchingTags] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagPickedId, setTagPickedId] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ url: string; title: string }>>([]);
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
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [view, setView] = useState<'report' | 'add_profile'>('report');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileEmail, setNewProfileEmail] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [addProfileStep, setAddProfileStep] = useState(1);
  const [additionalSocialLinks, setAdditionalSocialLinks] = useState<AdditionalSocialLinkRow[]>([]);
  const [extraLinkPlatform, setExtraLinkPlatform] = useState<Platform>('instagram');
  const [extraLinkUrl, setExtraLinkUrl] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    if (newProfileName) {
      setNewProfileUsername(generateUsername(newProfileName));
    } else {
      setNewProfileUsername('');
    }
  }, [newProfileName]);

  function reset() {
    stopCamera();
    setStep(1);
    setType(null);
    setCategory('');
    setDeed('');
    setDescription('');
    setFeelings('');
    setEvidenceSourceUrl('');
    setIsIRL(false);
    setAiConsent(true);
    setPublicAnonymous(!user);
    setTaggedPerson('');
    setTagSuggestions([]);
    setShowTagSuggestions(false);
    setTagPickedId(null);
    setLinks([]);
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

  function addLink() {
    if (links.length >= 10) return;
    setLinks((prev) => [...prev, { url: '', title: '' }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(index: number, field: 'url' | 'title', value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  // Initialize category/deed when impact type changes. Reset only when the
  // current category is invalid for the new type — preserving the user's
  // selection prevents the dropdown lock that prompted issue #78.
  useEffect(() => {
    if (!type) {
      setCategory('');
      setDeed('');
      return;
    }
    const validForType = SHEET_SCORING_INDEX.some((row) => row.type === type && row.category === category);
    if (!validForType) {
      const first = SHEET_SCORING_INDEX.find((row) => row.type === type);
      if (first) {
        setCategory(first.category);
        setDeed(first.deed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // When the user picks a new category, auto-select the first valid deed in
  // that category so submission stays valid without locking the dropdown.
  useEffect(() => {
    if (!category) return;
    const validDeed = deedOptions.find((row) => row.category === category && row.deed === deed);
    if (validDeed) return;
    const firstInCategory = deedOptions.find((row) => row.category === category);
    if (firstInCategory) setDeed(firstInCategory.deed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, deedOptions]);

  // Debounced search for the "Tag People Involved" field — pulls existing
  // Shosha profiles so reporters don't fragment reputation by re-typing names.
  useEffect(() => {
    if (!open) return;
    const query = taggedPerson.trim();
    if (query.length < 2 || tagPickedId) {
      setTagSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchingTags(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}&discover=0`);
        const payload = await readApiPayload<{ candidates?: AccountCandidate[]; accounts?: AccountRecord[] }>(
          response,
          'Search failed.'
        );
        if (!payload.ok || !payload.data) {
          setTagSuggestions([]);
          return;
        }
        const rtdb = (payload.data.accounts ?? []).map((acc: AccountRecord) => ({
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
          existingAccountId: acc._id,
        })) as AccountCandidate[];
        setTagSuggestions([...rtdb, ...(payload.data.candidates ?? [])].slice(0, 6));
      } catch {
        setTagSuggestions([]);
      } finally {
        setSearchingTags(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, taggedPerson, tagPickedId]);

  useEffect(() => {
    if (description.length < 20) return;

    const timeout = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const response = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, geminiApiKey })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.intent) setIntent(result.intent.toString());
          if (result.pattern) setRepetitionPattern(result.pattern.toString());
        }
      } catch (error) {
        console.error('AI Classification failed:', error);
      } finally {
        setIsClassifying(false);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [description, geminiApiKey]);

  function close() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (open && !authLoading) {
      setPublicAnonymous(!user);
    }
  }, [authLoading, open, user]);

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
      setMedia({ url: payload.data.url, thumbUrl: (payload.data as any).thumbUrl, type: payload.data.type, bytes: payload.data.bytes });
      toast.push('Evidence uploaded.');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }

  const stopCamera = () => {
    const stream = cameraStreamRef.current ?? cameraStream;
    stream?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setCameraModalOpen(false);
    setCameraError(null);
  };

  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    setCameraError(null);
    setCameraFacing(facing);
    const existing = cameraStreamRef.current ?? cameraStream;
    existing?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: CAMERA_IDEAL_WIDTH },
          height: { ideal: CAMERA_IDEAL_HEIGHT },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        stopCamera();
        window.setTimeout(() => cameraInputRef.current?.click(), 100);
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + msg);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || CAMERA_IDEAL_WIDTH;
    canvas.height = video.videoHeight || CAMERA_IDEAL_HEIGHT;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturing(true);
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) return;
        stopCamera();
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        const fakeEvent = {
          target: { files: dt.files },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleFile(fakeEvent);
      } finally {
        setCapturing(false);
      }
    }, 'image/jpeg', CAMERA_JPEG_QUALITY);
  };

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
    void videoRef.current.play();
    return () => {
      videoRef.current?.pause();
    };
  }, [cameraStream, cameraModalOpen]);

  async function ensureAccount() {
    if (accountId) return accountId;
    if (resolvedAccountId) {
      try {
        const response = await fetch(`/api/accounts/${encodeURIComponent(resolvedAccountId)}`, { cache: 'no-store' });
        const payload = await readApiPayload<{ _id: string }>(response, 'Could not verify target dossier.');
        if (response.ok && payload.ok && payload.data?._id) return payload.data._id;
      } catch {
      }
      setResolvedAccountId(null);
    }
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

    if (!isIRL) {
      if (!evidenceSourceUrl.trim()) {
        showSubmitError('Add a source URL for the proof before submitting.');
        return;
      }

      try {
        normalizeUrl(evidenceSourceUrl);
        new URL(normalizeUrl(evidenceSourceUrl));
      } catch {
        showSubmitError('Enter a valid source URL for the proof.');
        return;
      }
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
          media: { url: media.url, thumbUrl: media.thumbUrl, type: media.type, bytes: media.bytes },
          location: location || undefined,
          tags: taggedPerson ? [taggedPerson] : [],
          isIRL,
          ...(isIRL ? {} : { evidenceSourceUrl: normalizeUrl(evidenceSourceUrl) }),
          links: links
            .filter((l) => l.url.trim() !== '')
            .map((l) => ({
              url: l.url.trim(),
              ...(l.title.trim() && { title: l.title.trim() }),
            })),
          repetitionPattern,
          intent,
          circumstances,
          aiUndertaking: aiConsent,
          publicAnonymous: !user || publicAnonymous
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
              ? 'Add Profile'
              : 'Create Report'}
          </h2>
          <div className="h-9 w-9 shrink-0" />
        </div>

        {view === 'add_profile' ? (
          <div className="flex flex-col h-full overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mb-8 text-center">
              <h3 className="text-[20px] font-black mb-2">Create New Profile</h3>
              <p className="text-[13px] text-muted-foreground">This helps us track impacts across the web accurately.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Full Display Name</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. John Doe or Brand Name"
                  className="w-full rounded-[18px] border border-border bg-card p-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Platform Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                  <input
                    type="text"
                    value={newProfileUsername}
                    onChange={(e) => setNewProfileUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="username"
                    className="w-full rounded-[18px] border border-border bg-card p-4 pl-9 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground ml-1">Auto-generated from name. You can customize it.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Primary Social Link</label>
                <input
                  type="url"
                  value={newProfileUrl}
                  onChange={(e) => setNewProfileUrl(e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="w-full rounded-[18px] border border-border bg-card p-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="mt-auto pt-10 pb-4">
              <Button
                className="w-full rounded-full py-6 text-[16px] font-black shadow-xl"
                disabled={!newProfileName || !newProfileUsername || !newProfileUrl}
                onClick={async () => {
                  try {
                    const response = await fetch('/api/accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        displayName: newProfileName,
                        username: newProfileUsername,
                        platform: 'instagram', 
                        sourceUrl: newProfileUrl,
                        manual: true
                      })
                    });
                    const res = await response.json();
                    if (res.accountId || res.data?._id) {
                      const id = res.accountId || res.data?._id;
                      setResolvedAccountId(id);
                      setTargetDisplayName(newProfileName);
                      setTargetHandle(newProfileUsername);
                      setTargetSourceUrl(newProfileUrl);
                      setTargetManual(true);
                      setView('report');
                    }
                  } catch (err) {
                    console.error('Failed to create account:', err);
                  }
                }}
              >
                Create Profile & Continue
              </Button>
              <button
                type="button"
                onClick={() => setView('report')}
                className="w-full mt-4 text-[14px] font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel and go back
              </button>
            </div>
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
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
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
                    className="w-full rounded-full border border-border bg-card py-3.5 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  {searchingCandidates && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>

                {targetDisplayName || targetSourceUrl ? (
                  <div className="mt-4 rounded-[24px] border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                          {targetDisplayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-black flex items-center gap-1.5">
                            {targetDisplayName}
                            {targetVerified && <ShieldCheck size={14} className="text-primary shrink-0" />}
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground font-medium">
                            {targetManual ? 'Platform Profile' : targetPlatform === 'x' ? 'X' : targetPlatform} / @{targetHandle}
                          </p>
                        </div>
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
                        className="shrink-0 rounded-full bg-background border border-border px-4 py-2 text-[11px] font-black hover:bg-muted transition-colors shadow-sm"
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
                        className="w-full rounded-[22px] border border-border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:border-primary/30 group active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-[12px] font-black shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {candidate.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold group-hover:text-primary transition-colors">{candidate.displayName}</p>
                              <p className="truncate text-[11px] text-muted-foreground font-medium">
                                {candidate.platform === 'x' ? 'X' : candidate.platform} / @{candidate.username}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                            {Math.round(candidate.confidence * 100)}% Match
                          </span>
                        </div>
                      </button>
                    ))}
                    
                    {targetHandle.trim().length > 1 && (
                      <div className="pt-2">
                        <div className="rounded-[24px] border border-dashed border-border bg-muted/20 p-6 text-center">
                          <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Plus size={20} className="text-muted-foreground" />
                          </div>
                          <p className="text-[14px] font-black mb-1">Profile not found</p>
                          <p className="text-[12px] text-muted-foreground mb-4 font-medium px-4">They don&apos;t exist in our directory yet. Help us build the platform by adding them.</p>
                          <Button 
                            variant="secondary" 
                            className="w-full rounded-full py-3 text-[13px] font-black"
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

          {/* Impact Selector */}
          <section className="space-y-4">
            <h3 className="text-[14px] font-bold mb-3 flex items-center justify-between gap-2 sm:text-[16px] sm:mb-4">
              <span className="truncate">How would you describe the impact?</span>
              <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider sm:text-[11px]">Required</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setType('positive')}
                className={cn(
                  "relative group flex flex-col items-center justify-center rounded-[24px] border-2 p-5 transition-all active:scale-[0.98] sm:p-7",
                  type === 'positive'
                    ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5"
                )}
              >
                <div className={cn(
                  "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 sm:mb-4 sm:h-14 sm:w-14",
                  type === 'positive' ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  <Heart size={24} fill={type === 'positive' ? "currentColor" : "none"} />
                </div>
                <span className={cn("text-[14px] font-black sm:text-[15px]", type === 'positive' ? "text-emerald-500" : "text-foreground")}>Positive</span>
              </button>
              <button
                type="button"
                onClick={() => setType('negative')}
                className={cn(
                  "relative group flex flex-col items-center justify-center rounded-[24px] border-2 p-5 transition-all active:scale-[0.98] sm:p-7",
                  type === 'negative'
                    ? "border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                    : "border-border bg-card hover:border-rose-500/50 hover:bg-rose-500/5"
                )}
              >
                <div className={cn(
                  "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 sm:mb-4 sm:h-14 sm:w-14",
                  type === 'negative' ? "bg-rose-500 text-white" : "bg-rose-500/10 text-rose-500"
                )}>
                  <AlertTriangle size={24} fill={type === 'negative' ? "currentColor" : "none"} />
                </div>
                <span className={cn("text-[14px] font-black sm:text-[15px]", type === 'negative' ? "text-rose-500" : "text-foreground")}>Negative</span>
              </button>
            </div>
          </section>

          {/* Deed Details */}
          <section className="space-y-4">
            <div className="rounded-[24px] border border-border bg-card/30 p-5 space-y-4 sm:p-6 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!type}
                  className="w-full rounded-full border border-border bg-card py-3 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 sm:py-3.5 sm:px-5"
                >
                  <option value="">{type ? 'Select category...' : 'Select impact first'}</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Specific Deed</label>
                <select
                  value={deed}
                  onChange={(e) => setDeed(e.target.value)}
                  disabled={!category}
                  className="w-full rounded-full border border-border bg-card py-3 px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 sm:py-3.5 sm:px-5"
                >
                  <option value="">{category ? 'Select deed...' : 'Select category first'}</option>
                  {filteredDeeds.map((row) => (
                    <option key={row.deed} value={row.deed}>{row.deed}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* AI Description */}
          <section className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-[14px] font-bold sm:text-[15px]">Describe the event</h3>
                {isClassifying && (
                  <div className="flex items-center gap-2 text-[11px] text-primary animate-pulse font-bold">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    AI Analyzing...
                  </div>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? Be specific. AI will automatically classify the intent and pattern based on your text."
                className="min-h-[140px] w-full resize-none rounded-[24px] border border-border bg-card p-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:min-h-[160px] sm:p-5 sm:text-[15px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase tracking-wider">Inferred Intent</label>
                  <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    className="w-full rounded-full border border-border bg-muted/50 py-2 px-4 text-[12px] focus:outline-none font-bold"
                  >
                    <option value="0">Accidental</option>
                    <option value="0.5">Neutral/Unknown</option>
                    <option value="1">Malicious/Intentional</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground ml-1 uppercase tracking-wider">Repeat Pattern</label>
                  <select
                    value={repetitionPattern}
                    onChange={(e) => setRepetitionPattern(e.target.value)}
                    className="w-full rounded-full border border-border bg-muted/50 py-2 px-4 text-[12px] focus:outline-none font-bold"
                  >
                    <option value="0">Single Occurrence</option>
                    <option value="0.5">Potential Pattern</option>
                    <option value="1">Chronic/Systemic</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Evidence Upload */}
          <section className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-[14px] font-bold px-1 sm:text-[15px]">Attach Proof</h3>
              {!media ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="group flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <div className="mb-2 rounded-full bg-muted p-3 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-[12px] font-bold">Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        typeof navigator !== 'undefined' &&
                        navigator.mediaDevices &&
                        typeof navigator.mediaDevices.getUserMedia === 'function'
                      ) {
                        setCameraModalOpen(true);
                        await startCamera('environment');
                      } else {
                        cameraInputRef.current?.click();
                      }
                    }}
                    disabled={uploading}
                    className="group flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                  >
                    <div className="mb-2 rounded-full bg-muted p-3 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                      <Camera size={20} />
                    </div>
                    <span className="text-[12px] font-bold">Open Camera</span>
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-border bg-muted shadow-inner">
                  {media.type === 'video' ? (
                    <video src={media.url} className="h-full w-full object-cover" controls />
                  ) : (
                    <img src={media.url} alt="Evidence" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia(null)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    Verified Evidence
                  </div>
                </div>
              )}
              {cameraModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
                  <div className="relative w-full max-w-md rounded-[24px] overflow-hidden bg-black flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
                      <span className="text-white text-[14px] font-bold">Take Photo</span>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-white/70 hover:text-white text-[13px] font-semibold px-3 py-1 rounded-full bg-white/10"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    {cameraError ? (
                      <div className="flex flex-col items-center justify-center p-8 text-white gap-4 min-h-[240px]">
                        <p className="text-[13px] text-center text-white/80">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            window.setTimeout(() => cameraInputRef.current?.click(), 100);
                          }}
                          className="px-6 py-2 rounded-full bg-white text-black text-[13px] font-bold"
                        >
                          Open Gallery Instead
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-6 py-2 rounded-full bg-white/10 text-white text-[13px] font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full aspect-video object-cover bg-black"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex items-center justify-between px-6 py-4 bg-black gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              startCamera(cameraFacing === 'environment' ? 'user' : 'environment')
                            }
                            className="p-3 rounded-full bg-white/10 text-white text-[18px]"
                            title="Flip camera"
                          >
                            🔄
                          </button>

                          <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!cameraStream || capturing || uploading}
                            className="flex-1 py-3 rounded-full bg-white text-black text-[14px] font-bold disabled:opacity-40 transition-opacity"
                          >
                            {capturing ? 'Processing…' : '📸 Capture'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              window.setTimeout(() => fileInputRef.current?.click(), 100);
                            }}
                            className="p-3 rounded-full bg-white/10 text-white text-[18px]"
                            title="Upload from gallery"
                          >
                            🖼️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFile}
                accept="image/*,video/*"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFile}
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
              />
            </div>
          </section>

          {/* Adjudication Settings */}
          <section className="space-y-4">
            <div className="rounded-[24px] border border-border bg-card/30 p-5 space-y-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold">Anonymous Identity</h4>
                  <p className="text-[11px] text-muted-foreground">Keep your name private on public pages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicAnonymous(!publicAnonymous)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    publicAnonymous ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                    publicAnonymous ? "left-6" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold">AI Undertaking</h4>
                  <p className="text-[11px] text-muted-foreground">Confirm you analyzed this report with AI.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiConsent(!aiConsent)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    aiConsent ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                    aiConsent ? "left-6" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Adjudication Depth</label>
                <select
                  value={circumstances}
                  onChange={(e) => setCircumstances(e.target.value)}
                  className="w-full rounded-full border border-border bg-card py-3 px-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:py-3.5 sm:px-5"
                >
                  <option value="1">Surface Level</option>
                  <option value="1.5">Contextualized</option>
                  <option value="2">Evidence Backed</option>
                  <option value="2.5">Thought Through</option>
                  <option value="3">Fully Planned</option>
                </select>
              </div>
            </div>
          </section>

          {/* Source + Optional Details */}
          <section className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-[14px] font-bold mb-3 flex items-center justify-between gap-2 sm:text-[16px] sm:mb-4">
                <span className="truncate">Source & Details</span>
                {!isIRL ? (
                  <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider sm:text-[11px]">Source Required</span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider sm:text-[11px]">IRL INCIDENT</span>
                )}
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => { setIsIRL(false); setEvidenceSourceUrl(''); }}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                      !isIRL
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border'
                    }`}
                  >
                    🌐 Online
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsIRL(true); setEvidenceSourceUrl(''); }}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                      isIRL
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border'
                    }`}
                  >
                    📍 IRL
                  </button>
                </div>

                {!isIRL && (
                <div className="space-y-2">
                  <label className="text-[13px] font-bold block ml-1 uppercase tracking-wider text-muted-foreground">Proof Source URL</label>
                  <p className="text-[11px] text-muted-foreground ml-1">Original article, post, or video behind this proof.</p>
                  <input
                    type="url"
                    value={evidenceSourceUrl}
                    onChange={(e) => setEvidenceSourceUrl(e.target.value)}
                    placeholder="https://example.com/source"
                    className="w-full rounded-[18px] border border-border bg-card p-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                )}

                <div className="relative group">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    value={taggedPerson}
                    onChange={(e) => {
                      setTaggedPerson(e.target.value);
                      setTagPickedId(null);
                      setShowTagSuggestions(true);
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowTagSuggestions(false), 150)}
                    placeholder="Tag people involved"
                    className="w-full rounded-full border border-border bg-card py-3.5 pl-12 pr-10 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  {searchingTags && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {showTagSuggestions && tagSuggestions.length > 0 && !tagPickedId && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-card shadow-xl">
                      {tagSuggestions.map((candidate) => (
                        <button
                          key={`${candidate.existingAccountId ?? ''}:${candidate.platform}:${candidate.username}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const handle = candidate.username.replace(/^@/, '');
                            setTaggedPerson(`@${handle}`);
                            setTagPickedId(candidate.existingAccountId ?? `${candidate.platform}:${handle}`);
                            setShowTagSuggestions(false);
                            setTagSuggestions([]);
                          }}
                          className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-black">
                            {candidate.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              candidate.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold flex items-center gap-1.5">
                              {candidate.displayName}
                              {candidate.verified && <ShieldCheck size={12} className="text-primary shrink-0" />}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {candidate.platform === 'x' ? 'X' : candidate.platform} / @{candidate.username}
                            </p>
                          </div>
                          {candidate.existingAccountId && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                              On Shosha
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location (Optional)"
                    className="w-full rounded-full border border-border bg-card py-3.5 pl-12 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
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
              disabled={submitting || uploading || !type || !selectedScoringRow || description.length < 10 || !media || (!isIRL && !evidenceSourceUrl.trim()) || (!accountId && !targetHandle.trim())}
              className={cn(
                "w-full rounded-full py-5 text-[16px] font-black transition-all active:scale-[0.98] shadow-xl sm:text-[17px]",
                (submitting || uploading || !type || !selectedScoringRow || description.length < 10 || !media || (!isIRL && !evidenceSourceUrl.trim()) || (!accountId && !targetHandle.trim()))
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70 shadow-none"
                  : "bg-foreground text-background hover:bg-foreground/90 hover:shadow-2xl"
              )}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  <span>Submitting Filing...</span>
                </div>
              ) : (
                'Submit Final Report'
              )}
            </button>
            <p className="text-center text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest sm:text-[11px]">
              <ShieldCheck size={11} className="text-primary shrink-0" />
              <span>{publicAnonymous ? 'Privacy Shield Active' : 'Public Attribution Enabled'}</span>
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
