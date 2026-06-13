import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Settings,
  Upload,
  Globe,
  Lock,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/api/media';
import { createBubble } from '@/api/bubbles';
import type { BubbleType, BubbleVisibility } from '@/types/bubble';
import ImageCropModal from '@/components/bubbles/ImageCropModal';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Members' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Review' },
];

const BUBBLE_TYPES: { id: BubbleType; label: string; icon: string }[] = [
  { id: 'FAMILY', label: 'Family', icon: '🏠' },
  { id: 'FRIEND_GROUP', label: 'Friend Group', icon: '👥' },
  { id: 'COLLEGE_GROUP', label: 'College Group', icon: '🎓' },
  { id: 'WORK_GROUP', label: 'Work Group', icon: '💼' },
  { id: 'COMPANY', label: 'Company', icon: '🏢' },
  { id: 'SPORTS_GROUP', label: 'Sports Group', icon: '⚽' },
  { id: 'OTHER', label: 'Other', icon: '✨' },
];

function bubbleTypeLabel(type: BubbleType): string {
  return BUBBLE_TYPES.find((t) => t.id === type)?.label ?? type;
}

export default function CreateBubbleFlow() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'image' | null>(null);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    bubble_type: 'FRIEND_GROUP' as BubbleType,
    category: '',
    cover_image_url: '',
    image_url: '',
    visibility: 'PUBLIC' as BubbleVisibility,
  });

  const [invitedUsernames, setInvitedUsernames] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [cropState, setCropState] = useState<{
    type: 'cover' | 'image';
    src: string;
    aspect: number;
  } | null>(null);

  const uploadCroppedBlob = async (blob: Blob, type: 'cover' | 'image') => {
    setUploading(type);
    try {
      const file = new File([blob], `${type}.jpg`, { type: 'image/jpeg' });
      const res = await uploadMedia(file);
      if (!res.ok || !res.data?.url) {
        throw new Error(typeof res.error === 'string' ? res.error : 'Upload failed');
      }
      setForm((prev) => ({
        ...prev,
        [type === 'cover' ? 'cover_image_url' : 'image_url']: res.data!.url,
      }));
      toast.push('Image uploaded successfully!');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      setCropState(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const src = URL.createObjectURL(file);
    setCropState({
      type,
      src,
      aspect: type === 'cover' ? 16 / 6 : 1,
    });
  };

  const addUsername = () => {
    const cleaned = usernameInput.trim().replace(/^@/, '').toLowerCase();
    if (!cleaned || invitedUsernames.includes(cleaned)) return;
    setInvitedUsernames((prev) => [...prev, cleaned]);
    setUsernameInput('');
  };

  const removeUsername = (username: string) => {
    setInvitedUsernames((prev) => prev.filter((u) => u !== username));
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const bubble = await createBubble({
        name: form.name,
        tagline: form.tagline || undefined,
        description: form.description,
        bubble_type: form.bubble_type,
        category: form.category || undefined,
        cover_image_url: form.cover_image_url || undefined,
        image_url: form.image_url || undefined,
        visibility: form.visibility,
        invited_usernames: invitedUsernames.length ? invitedUsernames : undefined,
      });
      toast.push('Bubble created successfully!');
      navigate(`/bubbles/${bubble.id}`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Creation failed');
      setLoading(false);
    }
  };

  const canContinue = () => {
    if (step === 1) {
      return form.name.length >= 2 && form.description.length >= 10;
    }
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else void handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex flex-col items-center border-b bg-background/80 px-4 py-4 backdrop-blur-md md:py-6">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-transform active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-[18px] font-black leading-tight md:text-[22px]">Create Bubble</h1>
            <p className="text-[12px] text-muted-foreground md:text-[13px]">
              Build your community. Set your impact.
            </p>
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-6 flex w-full max-w-2xl items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="relative flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black transition-all md:h-9 md:w-9 md:text-[14px]',
                    step >= s.id
                      ? 'scale-110 bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {s.id}
                </div>
                <span
                  className={cn(
                    'mt-1 text-[10px] font-bold transition-colors md:text-[11px]',
                    step === s.id ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-[2px] flex-1 -translate-y-2.5 md:-translate-y-3.5',
                    step > s.id ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-8 lg:grid-cols-2"
            >
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-[20px] font-black md:text-[24px]">Bubble Identity</h2>
                  <p className="text-[13px] text-muted-foreground md:text-[14px]">
                    Add the basics about your community.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">
                    Cover Image <span className="text-muted-foreground">(Recommended)</span>
                  </label>
                  <label className="relative block cursor-pointer">
                    <div className="relative flex aspect-[16/6] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30 transition-all hover:bg-muted/50">
                      {uploading === 'cover' ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <>
                          <Upload size={32} className="text-muted-foreground" />
                          <p className="mt-2 text-[13px] font-bold">Upload cover image</p>
                        </>
                      )}
                      {form.cover_image_url && (
                        <img
                          src={form.cover_image_url}
                          alt="Cover"
                          className="absolute inset-0 h-full w-full rounded-[24px] object-cover"
                        />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(e, 'cover')}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-[120px_1fr] gap-4 md:grid-cols-[160px_1fr]">
                  <div className="space-y-2">
                    <label className="text-[12px] font-black uppercase tracking-wider">
                      Bubble Image
                    </label>
                    <label className="relative block cursor-pointer">
                      <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border bg-muted/30">
                        {uploading === 'image' ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <Users size={24} className="text-muted-foreground" />
                        )}
                        {form.image_url && (
                          <img
                            src={form.image_url}
                            alt="Bubble"
                            className="absolute inset-0 h-full w-full rounded-[24px] object-cover"
                          />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e, 'image')}
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-black uppercase tracking-wider">
                        Bubble Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Dream Chasers"
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 md:text-[15px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-black uppercase tracking-wider">
                        Tagline
                      </label>
                      <input
                        value={form.tagline}
                        onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                        placeholder="e.g. Building a better future, together."
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 md:text-[15px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your bubble, its purpose and what members can expect."
                    className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 lg:min-h-[220px] md:text-[15px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">
                    Bubble Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4">
                    {BUBBLE_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm({ ...form, bubble_type: t.id })}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-xl border px-2 py-3 transition-all',
                          form.bubble_type === t.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-muted/50',
                        )}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="mt-2 text-center text-[10px] font-bold leading-tight">
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] font-black md:text-[24px]">Invite Members</h2>
                <p className="text-[13px] text-muted-foreground md:text-[14px]">
                  Enter Shosha usernames to invite (one at a time).
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="@username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUsername();
                    }
                  }}
                  className="h-14 flex-1 rounded-[24px] bg-muted/50 px-4 text-sm font-medium outline-none focus:bg-muted focus:ring-2 focus:ring-primary/20 md:text-base"
                />
                <button
                  type="button"
                  onClick={addUsername}
                  className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-primary text-white"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="min-h-[100px] rounded-[24px] border border-dashed border-border bg-muted/10 p-4">
                <label className="mb-2 block text-[12px] font-black uppercase tracking-wider">
                  Invited ({invitedUsernames.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {invitedUsernames.map((username) => (
                    <span
                      key={username}
                      className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[12px] font-bold"
                    >
                      @{username}
                      <button
                        type="button"
                        onClick={() => removeUsername(username)}
                        className="text-primary hover:text-red-500"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                    </span>
                  ))}
                  {invitedUsernames.length === 0 && (
                    <p className="w-full py-4 text-center text-[12px] text-muted-foreground">
                      No one invited yet. Add usernames above.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] font-black md:text-[24px]">Bubble Settings</h2>
              </div>
              <div className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-black">Private Bubble</p>
                    <p className="text-[12px] text-muted-foreground">
                      Only invited members can join.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        visibility: form.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC',
                      })
                    }
                    className={cn(
                      'relative h-7 w-14 rounded-full transition-all',
                      form.visibility === 'PRIVATE' ? 'bg-primary' : 'bg-muted',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                        form.visibility === 'PRIVATE' ? 'left-8' : 'left-1',
                      )}
                    />
                  </button>
                </div>
                <div className="border-t border-border pt-6">
                  <div className="flex items-start gap-4">
                    <Settings size={14} className="mt-1 text-primary" />
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      As the creator, you have full control over members and settings.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[20px] font-black md:text-[24px]">Final Review</h2>
              </div>
              <div className="overflow-hidden rounded-[24px] border border-border bg-background shadow-xl">
                <div className="relative h-32 bg-muted md:h-48">
                  {form.cover_image_url && (
                    <img
                      src={form.cover_image_url}
                      alt="Cover"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex gap-4 p-6">
                  <div className="relative -mt-14 h-20 w-20 overflow-hidden rounded-[24px] border-4 border-background bg-muted shadow-2xl md:h-24 md:w-24">
                    {form.image_url ? (
                      <img src={form.image_url} alt="Bubble" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Building2 size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black md:text-2xl">{form.name || 'Unnamed Bubble'}</h4>
                    <p className="text-[14px] font-bold text-primary md:text-[16px]">
                      {form.tagline || 'No tagline set'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border bg-muted/5 p-6">
                  <p className="text-[13px] italic text-muted-foreground md:text-[14px]">
                    &quot;{form.description}&quot;
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[24px] border border-border/50 bg-muted/30 p-5">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Visibility
                  </p>
                  <p className="flex items-center gap-2 text-base font-bold capitalize">
                    {form.visibility === 'PUBLIC' ? <Globe size={16} /> : <Lock size={16} />}
                    {form.visibility.toLowerCase()}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/50 bg-muted/30 p-5">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Type
                  </p>
                  <p className="text-base font-bold">{bubbleTypeLabel(form.bubble_type)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto mt-8 flex max-w-2xl gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex h-14 items-center justify-center rounded-[24px] border-2 border-border px-8 text-sm font-black transition-all hover:bg-muted active:scale-95 md:text-base"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue() || loading}
            className="flex h-14 flex-1 items-center justify-center rounded-[24px] bg-primary text-sm font-black text-white transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : step === 4 ? (
              'Create Bubble'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </main>

      {cropState ? (
        <ImageCropModal
          open
          imageSrc={cropState.src}
          aspect={cropState.aspect}
          title={cropState.type === 'cover' ? 'Crop cover image' : 'Crop bubble image'}
          onClose={() => {
            URL.revokeObjectURL(cropState.src);
            setCropState(null);
          }}
          onConfirm={(blob) => void uploadCroppedBlob(blob, cropState.type)}
        />
      ) : null}
    </div>
  );
}
