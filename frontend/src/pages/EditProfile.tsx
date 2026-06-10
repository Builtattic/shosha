import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getCurrentUser, updateCurrentUser } from '@/api/auth';
import { uploadMedia } from '@/api/media';
import { apiClient } from '@/lib/apiClient';
import type { UpdateUserPayload } from '@/types/user';
import { useToast } from '@/components/ui/Toast';

const USERNAME_PATTERN = /^[a-z0-9_]{3,64}$/;

type FormState = {
  display_name: string;
  username: string;
  photo_url: string;
  bio: string;
  headline: string;
  city: string;
  website_url: string;
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
  const [form, setForm] = useState<FormState>({
    display_name: '',
    username: '',
    photo_url: '',
    bio: '',
    headline: '',
    city: '',
    website_url: '',
  });

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
    const cleaned = raw.replace(/^@+/, '').toLowerCase();
    updateField('username', cleaned);
    setUsernameAvailable(null);

    if (!cleaned) {
      setUsernameError(null);
      return;
    }
    if (!USERNAME_PATTERN.test(cleaned)) {
      setUsernameError('Letters, numbers, underscores only. 3–64 chars.');
      return;
    }
    setUsernameError(null);

    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    setUsernameChecking(true);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          `/users/username-availability?username=${encodeURIComponent(cleaned)}`,
        );
        setUsernameAvailable(res.data.available);
        if (!res.data.available) {
          setUsernameError('Username is already taken');
        }
      } catch {
        // ignore
      } finally {
        setUsernameChecking(false);
      }
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

    const payload: UpdateUserPayload = {};
    if (!initial) return;
    if (form.display_name !== initial.display_name) payload.display_name = form.display_name || undefined;
    if (form.username !== initial.username) payload.username = form.username || undefined;
    if (form.photo_url !== initial.photo_url) payload.photo_url = form.photo_url || undefined;
    if (form.bio !== initial.bio) payload.bio = form.bio || undefined;
    if (form.headline !== initial.headline) payload.headline = form.headline || undefined;
    if (form.city !== initial.city) payload.city = form.city || undefined;
    if (form.website_url !== initial.website_url) payload.website_url = form.website_url || undefined;

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
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
          More profile fields coming soon.
        </div>

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
        </section>
      </div>
    </main>
  );
}
