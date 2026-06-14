import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { getCurrentUser, updateCurrentUser } from '@/api/auth';
import { uploadMedia } from '@/api/media';
import { checkUsernameAvailability } from '@/api/users';
import { USE_MOCKS } from '@/lib/apiClient';
import { setMockOnboardingComplete } from '@/mocks/auth';
import {
  calcCredibility,
  CRED_SECTIONS,
  SOCIAL_LINKS_GATE,
} from '@/lib/credibility';
import type { CredibilityInput } from '@/lib/credibility';
import type { UpdateUserPayload } from '@/types/user';
import {
  OCCUPATION_ROLES,
  NETWORK_SIZES,
  EDUCATION_LEVELS,
  SPECIALIZED_FIELDS,
  MANAGEMENT_LEVELS,
  LIMITATIONS,
} from '@/lib/onboardingOptions';
import { normalizeUsername, validateUsernameFormat } from '@/lib/usernameValidation';
import { ClaimProfileSearchModal } from '@/components/profile/ClaimProfileSearchModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, CheckCircle2, Camera, Upload,
  Quote as QuoteIcon, Sparkles,
  ChevronDown, Loader2, AlertCircle, Lock, Link2,
} from 'lucide-react';

// ── Form State ─────────────────────────────────────────────────────────────────

type FormState = CredibilityInput & { email?: string };

const EMPTY: FormState = {
  name: '', username: '', phone: '', dob: '', city: '', country: '',
  occupationRole: '', networkSize: '', education: '', specializedField: '',
  managesMoneyPeopleSystem: '', physicalIntellectualLimitations: '',
  igUrl: '', tiktokUrl: '', xUrl: '', linkedinUrl: '', redditUrl: '',
  ytUrl: '', fbUrl: '', snapchatUrl: '',
  photoUrl: '', bio: '', quote: '',
  trustBadge: false,
  email: '',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

type InitialSnapshot = {
  display_name: string;
  username: string;
  photo_url: string;
  bio: string;
  city: string;
  phone: string;
  dob: string;
  country: string;
  quote: string;
  occupation_role: string;
  network_size: string;
  education: string;
  specialized_field: string;
  manages_money_people_system: string;
  physical_intellectual_limitations: string;
  ig_url: string;
  tiktok_url: string;
  x_url: string;
  linkedin_url: string;
  reddit_url: string;
  yt_url: string;
  fb_url: string;
  snapchat_url: string;
  onboarding_complete: boolean;
};

function snapshotFromForm(form: FormState, username: string, onboardingComplete: boolean): InitialSnapshot {
  return {
    display_name: form.name?.trim() ?? '',
    username,
    photo_url: form.photoUrl?.trim() ?? '',
    bio: form.bio?.trim() ?? '',
    city: form.city?.trim() ?? '',
    phone: form.phone?.trim() ?? '',
    dob: form.dob?.trim() ?? '',
    country: form.country?.trim() ?? '',
    quote: form.quote?.trim() ?? '',
    occupation_role: form.occupationRole?.trim() ?? '',
    network_size: form.networkSize?.trim() ?? '',
    education: form.education?.trim() ?? '',
    specialized_field: form.specializedField?.trim() ?? '',
    manages_money_people_system: form.managesMoneyPeopleSystem?.trim() ?? '',
    physical_intellectual_limitations: form.physicalIntellectualLimitations?.trim() ?? '',
    ig_url: form.igUrl?.trim() ?? '',
    tiktok_url: form.tiktokUrl?.trim() ?? '',
    x_url: form.xUrl?.trim() ?? '',
    linkedin_url: form.linkedinUrl?.trim() ?? '',
    reddit_url: form.redditUrl?.trim() ?? '',
    yt_url: form.ytUrl?.trim() ?? '',
    fb_url: form.fbUrl?.trim() ?? '',
    snapchat_url: form.snapchatUrl?.trim() ?? '',
    onboarding_complete: onboardingComplete,
  };
}

function buildUpdatePayload(
  current: InitialSnapshot,
  initial: InitialSnapshot,
  markComplete: boolean,
): UpdateUserPayload {
  const payload: UpdateUserPayload = {};
  const assignIfChanged = <K extends keyof InitialSnapshot>(
    key: K,
    apiKey: keyof UpdateUserPayload,
  ) => {
    if (current[key] === initial[key]) return;
    const value = current[key];
    (payload as Record<string, unknown>)[apiKey] = value === '' ? undefined : value;
  };

  assignIfChanged('display_name', 'display_name');
  assignIfChanged('username', 'username');
  assignIfChanged('bio', 'bio');
  assignIfChanged('city', 'city');
  assignIfChanged('phone', 'phone');
  assignIfChanged('dob', 'dob');
  assignIfChanged('country', 'country');
  assignIfChanged('quote', 'quote');
  assignIfChanged('occupation_role', 'occupation_role');
  assignIfChanged('network_size', 'network_size');
  assignIfChanged('education', 'education');
  assignIfChanged('specialized_field', 'specialized_field');
  assignIfChanged('manages_money_people_system', 'manages_money_people_system');
  assignIfChanged('physical_intellectual_limitations', 'physical_intellectual_limitations');
  assignIfChanged('ig_url', 'ig_url');
  assignIfChanged('tiktok_url', 'tiktok_url');
  assignIfChanged('x_url', 'x_url');
  assignIfChanged('linkedin_url', 'linkedin_url');
  assignIfChanged('reddit_url', 'reddit_url');
  assignIfChanged('yt_url', 'yt_url');
  assignIfChanged('fb_url', 'fb_url');
  assignIfChanged('snapchat_url', 'snapchat_url');

  if (current.photo_url !== initial.photo_url && current.photo_url) {
    payload.photo_url = current.photo_url;
  }

  if (markComplete && !initial.onboarding_complete) {
    payload.onboarding_complete = true;
  }

  return payload;
}

function validateSocialUrls(form: FormState): string | null {
  const checks: Array<[string | undefined, string]> = [
    [form.igUrl, 'Instagram'],
    [form.tiktokUrl, 'TikTok'],
    [form.xUrl, 'X / Twitter'],
    [form.linkedinUrl, 'LinkedIn'],
    [form.redditUrl, 'Reddit'],
    [form.ytUrl, 'YouTube'],
    [form.fbUrl, 'Facebook'],
    [form.snapchatUrl, 'Snapchat'],
  ];
  for (const [handle, label] of checks) {
    const trimmed = handle?.trim() ?? '';
    if (trimmed && !trimmed.startsWith('@')) {
      return `${label} handle must start with @`;
    }
  }
  return null;
}

function getPhotoUrlValidationError(photoUrl: string, photoUploading: boolean): string | null {
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;
  if (photoUploading) return 'Please wait for photo upload to finish.';
  if (trimmed.startsWith('data:')) {
    return 'Photo is still processing. Please wait or upload again.';
  }
  if (trimmed.startsWith('blob:')) {
    return 'Photo upload did not finish. Please upload again.';
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'Profile photo must be a valid http(s) URL.';
  }
  return null;
}

// ── Primitive UI Components ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children}
    </label>
  );
}

function TextField({
  value, onChange, placeholder, type = 'text', readOnly, maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none',
        'transition-all focus:border-primary focus:ring-2 focus:ring-primary/15',
        readOnly && 'bg-muted/40 text-muted-foreground cursor-not-allowed',
      )}
    />
  );
}

function SelectField({
  value, onChange, options, placeholder = 'Select option',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none rounded-xl border border-border bg-card px-3.5 py-2.5 pr-9 text-[13px] outline-none',
          'transition-all focus:border-primary focus:ring-2 focus:ring-primary/15',
          !value && 'text-muted-foreground',
        )}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="text-foreground">{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function SocialField({
  icon, label, value, onChange, placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 transition-all',
      filled ? 'border-primary/50 bg-primary/5' : 'border-border',
    )}>
      <span className={cn('shrink-0', filled ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">{label}</p>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-transparent text-[12px] font-medium outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}

// ── Section Card ───────────────────────────────────────────────────────────────

function SectionCard({
  step, title, subtitle, weight, percent, children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  weight: number;
  percent: number;
  children: React.ReactNode;
}) {
  const complete = percent >= 99;
  return (
    <section className="rounded-[20px] border border-border bg-background p-5 sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
            complete ? 'bg-foreground text-background' : 'bg-muted text-foreground',
          )}>
            {complete ? <CheckCircle2 size={14} /> : step}
          </div>
          <div>
            <h3 className="text-[15px] font-bold leading-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {Math.round((percent / 100) * weight)}/{weight}%
          </div>
          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-300', complete ? 'bg-foreground' : 'bg-primary')}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </header>
      {children}
    </section>
  );
}

// ── Credibility Sidebar Panel ──────────────────────────────────────────────────

function CredibilityPanel({ input }: { input: CredibilityInput }) {
  const { total, breakdown } = useMemo(() => calcCredibility(input), [input]);
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (total / 100);

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
      {/* Donut gauge */}
      <div className="rounded-[24px] border border-border bg-background p-5 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/40" />
              <circle
                cx="70" cy="70" r={radius}
                stroke="currentColor" strokeWidth="10" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                className={cn('transition-all duration-500', total >= 80 ? 'text-foreground' : 'text-primary')}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[26px] font-black leading-none tabular-nums font-mono">{total}%</div>
              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                Profile Complete
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-[14rem] text-[11px] text-muted-foreground leading-relaxed">
            Read each section's contribution to your{' '}
            <span className="font-semibold text-foreground">credibility</span> below.
          </p>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="rounded-[24px] border border-border bg-background p-5 shadow-sm">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Section breakdown
        </h4>
        <ul className="space-y-3">
          {(Object.keys(CRED_SECTIONS) as Array<keyof typeof CRED_SECTIONS>).map(key => {
            const row = breakdown[key];
            const pct = Math.round(row.ratio * 100);
            return (
              <li key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold">{row.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {Math.round(row.earned)}<span className="text-muted-foreground/60">/{row.weight}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full transition-all duration-300', pct >= 99 ? 'bg-foreground' : 'bg-primary')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {row.hint && <p className="text-[10px] text-muted-foreground">{row.hint}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="rounded-[24px] border border-dashed border-border bg-muted/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Credibility is independent of reports made by other people — it's built from{' '}
        <span className="font-semibold text-foreground">profile completion</span> and{' '}
        <span className="font-semibold text-foreground">verification</span> only.
      </div>
    </aside>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Onboard() {
  const navigate = useNavigate();
  const { firebaseUser, isLoading, sessionReady, refetchProfile, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    navigate('/sign-in', { replace: true });
  };

  const [form, setForm] = useState<FormState>(EMPTY);
  const [initial, setInitial] = useState<InitialSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [claimSearchOpen, setClaimSearchOpen] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleUsernameChange(raw: string) {
    const cleaned = normalizeUsername(raw);
    set('username', cleaned);
    setUsernameAvailable(null);

    if (!cleaned) {
      setUsernameError(null);
      return;
    }
    const formatError = validateUsernameFormat(cleaned);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }
    setUsernameError(null);

    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    setUsernameChecking(true);
    usernameCheckRef.current = setTimeout(async () => {
      const res = await checkUsernameAvailability(cleaned);
      if (res.ok && res.data) {
        setUsernameAvailable(res.data.available);
        setUsernameError(res.data.available ? null : 'Username is already taken');
      } else {
        // Backend returns 422 for invalid format (not V1's { available, error } shape).
        setUsernameAvailable(false);
        setUsernameError(res.error || 'Invalid username');
      }
      setUsernameChecking(false);
    }, 500);
  }

  // Pre-fill form from API profile + Firebase user
  useEffect(() => {
    if (isLoading || !sessionReady) return;
    if (!firebaseUser) {
      navigate('/sign-in?redirect=/onboard', { replace: true });
      return;
    }

    getCurrentUser()
      .then(res => {
        const u = res.ok ? res.data : null;
        const rawUsername = u?.username || firebaseUser.email?.split('@')[0] || '';
        const normalizedUsername = normalizeUsername(rawUsername);
        const nextForm: FormState = {
          ...EMPTY,
          name: u?.display_name || firebaseUser.displayName || '',
          username: normalizedUsername,
          phone: u?.phone || firebaseUser.phoneNumber || '',
          dob: u?.dob || '',
          city: u?.city || '',
          country: u?.country || '',
          email: u?.email || firebaseUser.email || '',
          occupationRole: u?.occupation_role || '',
          networkSize: u?.network_size || '',
          education: u?.education || '',
          specializedField: u?.specialized_field || '',
          managesMoneyPeopleSystem: u?.manages_money_people_system || '',
          physicalIntellectualLimitations: u?.physical_intellectual_limitations || '',
          igUrl: u?.ig_url || '',
          tiktokUrl: u?.tiktok_url || '',
          xUrl: u?.x_url || '',
          linkedinUrl: u?.linkedin_url || '',
          redditUrl: u?.reddit_url || '',
          ytUrl: u?.yt_url || '',
          fbUrl: u?.fb_url || '',
          snapchatUrl: u?.snapchat_url || '',
          photoUrl: u?.photo_url || firebaseUser.photoURL || '',
          bio: u?.bio || '',
          quote: u?.quote || '',
          trustBadge: Boolean(u?.trust_badge),
        };
        setForm(nextForm);
        setInitial(snapshotFromForm(nextForm, normalizedUsername, u?.onboarding_complete ?? false));

        if (!normalizedUsername) {
          setUsernameError(null);
          setUsernameAvailable(null);
          return;
        }
        const formatError = validateUsernameFormat(normalizedUsername);
        if (formatError) {
          setUsernameError(formatError);
          setUsernameAvailable(null);
          return;
        }
        setUsernameError(null);
        setUsernameChecking(true);
        checkUsernameAvailability(normalizedUsername)
          .then(availRes => {
            if (availRes.ok && availRes.data) {
              setUsernameAvailable(availRes.data.available);
              setUsernameError(availRes.data.available ? null : 'Username is already taken');
            } else {
              setUsernameAvailable(false);
              setUsernameError(availRes.error || 'Invalid username');
            }
          })
          .finally(() => setUsernameChecking(false));
      })
      .finally(() => setChecking(false));
  }, [isLoading, firebaseUser]); // eslint-disable-line

  const credibility = useMemo(() => calcCredibility(form), [form]);
  const age = calcAge(form.dob);

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be 10MB or smaller.');
      return;
    }

    const previousPhoto = form.photoUrl;
    setPhotoUploading(true);
    setError('');
    try {
      const res = await uploadMedia(file);
      if (res.ok && res.data?.url) {
        set('photoUrl', res.data.url);
      } else {
        set('photoUrl', previousPhoto);
        setError(res.error || 'Photo upload failed');
      }
    } catch {
      set('photoUrl', previousPhoto);
      setError('Photo upload failed');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleSave({ markComplete }: { markComplete: boolean }) {
    setError('');

    if (photoUploading) {
      setError('Please wait for photo upload to finish.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const normalizedUsername = normalizeUsername(form.username ?? '');
    const usernameFormatError = normalizedUsername
      ? validateUsernameFormat(normalizedUsername)
      : markComplete
        ? 'Username must be at least 3 characters'
        : null;
    if (usernameFormatError) {
      setUsernameError(usernameFormatError);
      setError('Please fix your username before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (usernameChecking) {
      setError('Please wait — still checking username availability.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (usernameAvailable === false) {
      setError('Please choose a different username.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (usernameError) {
      setError('Please fix your username before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const photoError = getPhotoUrlValidationError(form.photoUrl ?? '', photoUploading);
    if (photoError) {
      setError(photoError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const socialError = validateSocialUrls(form);
    if (socialError) {
      setError(socialError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if ((form.name?.trim() ?? '').length > 128) {
      setError('Full name must be at most 128 characters.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if ((form.quote?.trim() ?? '').length > 280) {
      setError('Quote must be at most 280 characters.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (markComplete) {
      const required: Array<[keyof FormState, string]> = [
        ['name', 'full name'], ['username', 'username'],
        ['dob', 'date of birth'], ['phone', 'phone number'],
        ['city', 'city'], ['country', 'country'],
        ['occupationRole', 'role'], ['networkSize', 'network size'],
        ['education', 'education level'], ['specializedField', 'specialization level'],
        ['managesMoneyPeopleSystem', 'management level'],
        ['physicalIntellectualLimitations', 'limitations answer'],
      ];
      const missing = required.find(([k]) => !String(form[k] ?? '').trim());
      if (missing) {
        setError(`Please enter your ${missing[1]}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (normalizedUsername) {
      const availRes = await checkUsernameAvailability(normalizedUsername);
      if (!availRes.ok || !availRes.data?.available) {
        const msg = availRes.data?.available === false
          ? 'Username is already taken'
          : (availRes.error || 'Invalid username');
        setUsernameAvailable(false);
        setUsernameError(msg);
        setError('Please fix your username before continuing.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setUsernameAvailable(true);
      setUsernameError(null);
    }

    if (!initial) {
      setError('Profile is still loading. Please try again.');
      return;
    }

    const current = snapshotFromForm(form, normalizedUsername, markComplete || initial.onboarding_complete);
    const payload = buildUpdatePayload(current, initial, markComplete);

    if (Object.keys(payload).length === 0) {
      if (markComplete) {
        if (USE_MOCKS) setMockOnboardingComplete(true);
        refetchProfile();
        setDone(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } else {
        setError('No changes to save.');
      }
      return;
    }

    setSaving(true);
    try {
      const res = await updateCurrentUser(payload);

      if (!res.ok) throw new Error(res.error || 'Failed to save profile');

      const nextInitial = snapshotFromForm(
        form,
        normalizedUsername,
        markComplete ? true : initial.onboarding_complete,
      );
      setInitial(nextInitial);

      if (markComplete) {
        if (USE_MOCKS) setMockOnboardingComplete(true);
        refetchProfile();
        setDone(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / Done states ──────────────────────────────────────────────────
  if (isLoading || !firebaseUser || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="text-center rounded-[28px] border border-border bg-background p-10 shadow-2xl"
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-[22px] font-black tracking-tight">Profile Saved</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Routing you to your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background pb-16">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-serif text-[20px] font-black tracking-tight">
            Sho<span className="font-normal italic text-muted-foreground">शा</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <div className={cn(
                'h-2 w-2 rounded-full',
                credibility.total >= 80 ? 'bg-foreground' : 'bg-primary animate-pulse',
              )} />
              <span className="text-[11px] font-bold tabular-nums">{credibility.total}% complete</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="press text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:pt-10">

        {/* Title */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight">Create Your Profile</h1>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-xl">
            Completing your profile defines your{' '}
            <span className="font-semibold text-foreground">base credibility</span> before verification.
            Reach 80% from completion alone — verify to unlock the final 20%.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] font-medium text-destructive"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* Sidebar */}
          <CredibilityPanel input={form} />

          {/* Form sections */}
          <div className="space-y-5">

            {/* ── 1: Basic Info ─────────────────────────────────────────── */}
            <SectionCard
              step={1}
              title="Basic Info"
              subtitle="Identity essentials. Auto-fills where we can."
              weight={CRED_SECTIONS.basicInfo.weight}
              percent={credibility.breakdown.basicInfo.ratio * 100}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <TextField
                    value={form.name ?? ''}
                    onChange={v => set('name', v)}
                    placeholder="Your full name"
                    maxLength={128}
                  />
                </div>
                <div>
                  <FieldLabel>Username</FieldLabel>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
                    <span className="text-[13px] text-muted-foreground">@</span>
                    <input
                      value={form.username ?? ''}
                      onChange={e => handleUsernameChange(e.target.value)}
                      placeholder="your_handle"
                      maxLength={64}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 bg-transparent text-[13px] outline-none"
                    />
                    {usernameChecking ? (
                      <span className="text-[11px] text-muted-foreground">checking…</span>
                    ) : usernameAvailable === true ? (
                      <span className="text-[11px] text-green-600">available</span>
                    ) : usernameAvailable === false ? (
                      <span className="text-[11px] text-destructive">taken</span>
                    ) : null}
                  </div>
                  {usernameError ? (
                    <p className="mt-1 text-[11px] text-destructive">{usernameError}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-muted-foreground">Letters, numbers, underscores, periods. 3–64 chars.</p>
                  )}
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <TextField type="tel" value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <TextField type="date" value={form.dob ?? ''} onChange={v => set('dob', v)} />
                  {age !== null && <p className="mt-1 text-[10px] font-bold text-primary tabular-nums">Age: {age}</p>}
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <TextField value={form.city ?? ''} onChange={v => set('city', v)} placeholder="e.g. New York" />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <TextField value={form.country ?? ''} onChange={v => set('country', v)} placeholder="e.g. United States" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Email</FieldLabel>
                  <TextField value={form.email ?? firebaseUser.email ?? ''} onChange={() => {}} readOnly />
                </div>
              </div>
            </SectionCard>

            {/* ── 2: Profile Questions ──────────────────────────────────── */}
            <SectionCard
              step={2}
              title="Profile Questions"
              subtitle="The signals that calibrate your influence."
              weight={CRED_SECTIONS.questions.weight}
              percent={credibility.breakdown.questions.ratio * 100}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Role</FieldLabel>
                  <SelectField value={form.occupationRole ?? ''} onChange={v => set('occupationRole', v)} options={OCCUPATION_ROLES} />
                </div>
                <div>
                  <FieldLabel>Network / Audience Size</FieldLabel>
                  <SelectField value={form.networkSize ?? ''} onChange={v => set('networkSize', v)} options={NETWORK_SIZES} />
                </div>
                <div>
                  <FieldLabel>Education</FieldLabel>
                  <SelectField value={form.education ?? ''} onChange={v => set('education', v)} options={EDUCATION_LEVELS} />
                </div>
                <div>
                  <FieldLabel>Specialised Field</FieldLabel>
                  <SelectField value={form.specializedField ?? ''} onChange={v => set('specializedField', v)} options={SPECIALIZED_FIELDS} />
                </div>
                <div>
                  <FieldLabel>Manage money / people / systems?</FieldLabel>
                  <SelectField value={form.managesMoneyPeopleSystem ?? ''} onChange={v => set('managesMoneyPeopleSystem', v)} options={MANAGEMENT_LEVELS} />
                </div>
                <div>
                  <FieldLabel>Disability / Limitations</FieldLabel>
                  <SelectField value={form.physicalIntellectualLimitations ?? ''} onChange={v => set('physicalIntellectualLimitations', v)} options={LIMITATIONS} />
                </div>
              </div>
            </SectionCard>

            {/* ── 3: Social Media Links ─────────────────────────────────── */}
            <SectionCard
              step={3}
              title="Social Media Links"
              subtitle={`Add at least ${SOCIAL_LINKS_GATE} active profiles to claim full credit.`}
              weight={CRED_SECTIONS.socialLinks.weight}
              percent={credibility.breakdown.socialLinks.ratio * 100}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SocialField icon={<span className="text-[11px] font-black">IG</span>} label="Instagram" value={form.igUrl ?? ''} onChange={v => set('igUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">TT</span>} label="TikTok" value={form.tiktokUrl ?? ''} onChange={v => set('tiktokUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">X</span>} label="X / Twitter" value={form.xUrl ?? ''} onChange={v => set('xUrl', v)} placeholder="@username" />
                <SocialField icon={<Link2 size={16} />} label="LinkedIn" value={form.linkedinUrl ?? ''} onChange={v => set('linkedinUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">R/</span>} label="Reddit" value={form.redditUrl ?? ''} onChange={v => set('redditUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">YT</span>} label="YouTube" value={form.ytUrl ?? ''} onChange={v => set('ytUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">FB</span>} label="Facebook" value={form.fbUrl ?? ''} onChange={v => set('fbUrl', v)} placeholder="@username" />
                <SocialField icon={<span className="text-[11px] font-black">SC</span>} label="Snapchat" value={form.snapchatUrl ?? ''} onChange={v => set('snapchatUrl', v)} placeholder="@username" />
              </div>
            </SectionCard>

            {/* ── 4: Profile Extras ─────────────────────────────────────── */}
            <SectionCard
              step={4}
              title="Profile Extras"
              subtitle="Picture · About · Quote — each adds 5%."
              weight={CRED_SECTIONS.profileExtras.weight}
              percent={credibility.breakdown.profileExtras.ratio * 100}
            >
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5">
                {/* Photo upload */}
                <div>
                  <FieldLabel>Profile Picture</FieldLabel>
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className={cn(
                      'group relative h-36 w-36 rounded-2xl border-2 border-dashed bg-muted/30 transition-all',
                      'flex items-center justify-center overflow-hidden',
                      form.photoUrl ? 'border-primary/40' : 'border-border hover:border-primary/40',
                      photoUploading && 'opacity-60',
                    )}
                  >
                    {photoUploading ? (
                      <Loader2 size={24} className="animate-spin text-primary" />
                    ) : form.photoUrl ? (
                      <>
                        <img src={form.photoUrl} alt="Profile preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                          <Camera size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload photo</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={e => handlePhotoUpload(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1.5 text-[10px] text-muted-foreground">JPG / PNG / WebP / GIF · Max 10MB</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <FieldLabel>About You</FieldLabel>
                    <textarea
                      value={form.bio ?? ''}
                      onChange={e => set('bio', e.target.value)}
                      placeholder="Tell people about yourself — what you do, what you care about."
                      rows={3}
                      maxLength={280}
                      className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">{(form.bio ?? '').length}/280</p>
                  </div>
                  <div>
                    <FieldLabel>
                      <span className="inline-flex items-center gap-1.5">
                        <QuoteIcon size={11} /> Your Quote
                      </span>
                    </FieldLabel>
                    <TextField
                      value={form.quote ?? ''}
                      onChange={v => set('quote', v)}
                      placeholder="A line that represents you."
                      maxLength={280}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">{(form.quote ?? '').length}/280</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── 5: Verification ───────────────────────────────────────── */}
            <SectionCard
              step={5}
              title="Verification"
              subtitle="Verify your identity and unlock full trust."
              weight={CRED_SECTIONS.verification.weight}
              percent={credibility.breakdown.verification.ratio * 100}
            >
              <div className={cn(
                'flex items-center justify-between gap-4 rounded-2xl border p-4',
                form.trustBadge ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    form.trustBadge ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground',
                  )}>
                    <ShieldCheck size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-tight">
                      {form.trustBadge ? 'Trust Badge active' : 'Get Verified, Build Trust'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {form.trustBadge
                        ? 'You unlocked the full 20% verification weight.'
                        : 'Purchase a Trust Badge for $2 to lift you to 100%.'}
                    </p>
                  </div>
                </div>
                {form.trustBadge ? (
                  <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                    Verified
                  </span>
                ) : (
                  <Link
                    to="/trust-badge"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12px] font-bold text-background transition-opacity hover:opacity-90"
                  >
                    Get Trust Badge · $1
                  </Link>
                )}
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Lock size={11} /> Your identity stays private. Verification is handled off-platform.
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold leading-tight">Already on Shosha?</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    If someone made a profile of you, claim it instead of starting fresh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setClaimSearchOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-[11px] font-bold transition hover:bg-muted"
                >
                  Claim Profile
                </button>
              </div>
            </SectionCard>

            {/* ── Footer actions ─────────────────────────────────────────── */}
            <div className="rounded-[20px] border border-border bg-card p-5">
              <p className="text-[12px] text-muted-foreground mb-3">
                Once all sections are complete, you'll be at{' '}
                <span className="font-bold text-foreground">80%</span>.
                Add a Trust Badge to reach{' '}
                <span className="font-bold text-foreground">100% verified</span>.
              </p>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  disabled={saving || photoUploading}
                  onClick={() => handleSave({ markComplete: false })}
                  className="rounded-full border border-border bg-background px-5 py-3 text-[13px] font-bold transition hover:bg-muted disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading photo…' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  disabled={saving || photoUploading}
                  onClick={() => handleSave({ markComplete: true })}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  ) : photoUploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Uploading photo…</>
                  ) : (
                    <>Complete Profile <Sparkles size={14} /></>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ClaimProfileSearchModal
        open={claimSearchOpen}
        onClose={() => setClaimSearchOpen(false)}
      />
    </main>
  );
}
