import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getCurrentUser, updateCurrentUser } from '@/api/auth';
import { checkUsernameAvailability } from '@/api/users';
import { uploadMedia } from '@/api/media';
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
import { useToast } from '@/components/ui/Toast';

type FormState = {
  display_name: string;
  username: string;
  photo_url: string;
  bio: string;
  headline: string;
  city: string;
  website_url: string;
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
};

const EMPTY_FORM: FormState = {
  display_name: '',
  username: '',
  photo_url: '',
  bio: '',
  headline: '',
  city: '',
  website_url: '',
  phone: '',
  dob: '',
  country: '',
  quote: '',
  occupation_role: '',
  network_size: '',
  education: '',
  specialized_field: '',
  manages_money_people_system: '',
  physical_intellectual_limitations: '',
  ig_url: '',
  tiktok_url: '',
  x_url: '',
  linkedin_url: '',
  reddit_url: '',
  yt_url: '',
  fb_url: '',
  snapchat_url: '',
};

export default function EditProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refetchProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.ok && res.data) {
        const u = res.data;
        const loaded: FormState = {
          display_name: u.display_name ?? '',
          username: u.username ?? '',
          photo_url: u.photo_url ?? '',
          bio: u.bio ?? '',
          headline: u.headline ?? '',
          city: u.city ?? '',
          website_url: u.website_url ?? '',
          phone: u.phone ?? '',
          dob: u.dob ?? '',
          country: u.country ?? '',
          quote: u.quote ?? '',
          occupation_role: u.occupation_role ?? '',
          network_size: u.network_size ?? '',
          education: u.education ?? '',
          specialized_field: u.specialized_field ?? '',
          manages_money_people_system: u.manages_money_people_system ?? '',
          physical_intellectual_limitations: u.physical_intellectual_limitations ?? '',
          ig_url: u.ig_url ?? '',
          tiktok_url: u.tiktok_url ?? '',
          x_url: u.x_url ?? '',
          linkedin_url: u.linkedin_url ?? '',
          reddit_url: u.reddit_url ?? '',
          yt_url: u.yt_url ?? '',
          fb_url: u.fb_url ?? '',
          snapchat_url: u.snapchat_url ?? '',
        };
        setForm(loaded);
        setInitial(loaded);
      }
      setLoading(false);
    });
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleUsernameChange(raw: string) {
    const cleaned = normalizeUsername(raw);
    updateField('username', cleaned);
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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await uploadMedia(file);
      if (res.ok && res.data?.url) {
        updateField('photo_url', res.data.url);
      } else {
        toast.push(res.error || 'Photo upload failed');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setError('');
    if (usernameError) {
      setError('Please fix your username before saving.');
      return;
    }
    if (form.website_url.trim() && !/^https?:\/\//i.test(form.website_url.trim())) {
      setError('Website must start with http:// or https://');
      return;
    }

    if (!initial) return;
    // Send only changed fields. Send the RAW value (including "") so that a field
    // the user intentionally cleared is explicitly persisted as empty — the backend
    // omits unset keys (exclude_unset), so `undefined` would leave the old value.
    const payload: UpdateUserPayload = {};
    if (form.display_name !== initial.display_name) payload.display_name = form.display_name;
    if (form.username !== initial.username) payload.username = form.username;
    if (form.photo_url !== initial.photo_url) payload.photo_url = form.photo_url;
    if (form.bio !== initial.bio) payload.bio = form.bio;
    if (form.headline !== initial.headline) payload.headline = form.headline;
    if (form.city !== initial.city) payload.city = form.city;
    if (form.website_url !== initial.website_url) payload.website_url = form.website_url;
    if (form.phone !== initial.phone) payload.phone = form.phone;
    if (form.dob !== initial.dob) payload.dob = form.dob;
    if (form.country !== initial.country) payload.country = form.country;
    if (form.quote !== initial.quote) payload.quote = form.quote;
    if (form.occupation_role !== initial.occupation_role) payload.occupation_role = form.occupation_role;
    if (form.network_size !== initial.network_size) payload.network_size = form.network_size;
    if (form.education !== initial.education) payload.education = form.education;
    if (form.specialized_field !== initial.specialized_field) payload.specialized_field = form.specialized_field;
    if (form.manages_money_people_system !== initial.manages_money_people_system) payload.manages_money_people_system = form.manages_money_people_system;
    if (form.physical_intellectual_limitations !== initial.physical_intellectual_limitations) payload.physical_intellectual_limitations = form.physical_intellectual_limitations;
    if (form.ig_url !== initial.ig_url) payload.ig_url = form.ig_url;
    if (form.tiktok_url !== initial.tiktok_url) payload.tiktok_url = form.tiktok_url;
    if (form.x_url !== initial.x_url) payload.x_url = form.x_url;
    if (form.linkedin_url !== initial.linkedin_url) payload.linkedin_url = form.linkedin_url;
    if (form.reddit_url !== initial.reddit_url) payload.reddit_url = form.reddit_url;
    if (form.yt_url !== initial.yt_url) payload.yt_url = form.yt_url;
    if (form.fb_url !== initial.fb_url) payload.fb_url = form.fb_url;
    if (form.snapchat_url !== initial.snapchat_url) payload.snapchat_url = form.snapchat_url;

    if (Object.keys(payload).length === 0) {
      navigate('/profile');
      return;
    }

    setSaving(true);
    try {
      const res = await updateCurrentUser(payload);
      if (!res.ok) throw new Error(res.error || 'Failed to save');
      if (typeof refetchProfile === 'function') {
        refetchProfile();
      }
      navigate('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold">Edit Profile</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-bold text-background disabled:opacity-50"
        >
          {saving ? 'Saving' : 'Save'}
        </button>
      </header>

      <div className="mx-auto max-w-xl px-4">
        {error ? (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">{error}</p>
        ) : null}

        <section className="mt-6 flex flex-col items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-2xl font-bold">
              {form.photo_url ? (
                <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (form.display_name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background">
              <Camera size={16} />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {(
            [
              ['display_name', 'Display Name', 'text'],
              ['headline', 'Headline', 'text'],
              ['city', 'City', 'text'],
              ['website_url', 'Website URL', 'url'],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="rounded-xl border border-border p-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none"
              />
            </div>
          ))}

          <div className="rounded-xl border border-border p-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <input
                value={form.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="flex-1 bg-transparent text-[14px] outline-none"
                maxLength={64}
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
            ) : null}
          </div>

          <div className="rounded-xl border border-border p-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full resize-none bg-transparent text-[14px] outline-none"
            />
          </div>

          <div className="rounded-xl border border-border p-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Photo URL</label>
            <input
              type="url"
              value={form.photo_url}
              onChange={(e) => updateField('photo_url', e.target.value)}
              className="w-full bg-transparent text-[14px] outline-none"
            />
          </div>

          {/* Basic extras */}
          {(
            [
              ['phone', 'Phone Number', 'tel'],
              ['dob', 'Date of Birth', 'date'],
              ['country', 'Country', 'text'],
              ['quote', 'Quote', 'text'],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="rounded-xl border border-border p-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none"
              />
            </div>
          ))}

          {/* Profile questions */}
          {(
            [
              ['occupation_role', 'Role', OCCUPATION_ROLES],
              ['network_size', 'Network / Audience Size', NETWORK_SIZES],
              ['education', 'Education', EDUCATION_LEVELS],
              ['specialized_field', 'Specialised Field', SPECIALIZED_FIELDS],
              ['manages_money_people_system', 'Manage money / people / systems?', MANAGEMENT_LEVELS],
              ['physical_intellectual_limitations', 'Disability / Limitations', LIMITATIONS],
            ] as const
          ).map(([key, label, options]) => (
            <div key={key} className="rounded-xl border border-border p-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
              <select
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none"
              >
                <option value="">Select option</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}

          {/* Social links */}
          {(
            [
              ['ig_url', 'Instagram'],
              ['tiktok_url', 'TikTok'],
              ['x_url', 'X / Twitter'],
              ['linkedin_url', 'LinkedIn'],
              ['reddit_url', 'Reddit'],
              ['yt_url', 'YouTube'],
              ['fb_url', 'Facebook'],
              ['snapchat_url', 'Snapchat'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-border p-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
              <input
                type="url"
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none"
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
