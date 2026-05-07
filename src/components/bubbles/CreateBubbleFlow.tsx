'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Camera, 
  Users, 
  Heart, 
  GraduationCap, 
  Briefcase, 
  Trophy, 
  MoreHorizontal, 
  ChevronLeft,
  Calendar,
  Globe,
  Upload,
  MessageCircle,
  Facebook,
  Send,
  Link2,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Members' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Review' }
];

const BUBBLE_TYPES = [
  { id: 'family', label: 'Family', icon: Heart },
  { id: 'friend_group', label: 'Friend Group', icon: Users },
  { id: 'college_group', label: 'College Group', icon: GraduationCap },
  { id: 'work_group', label: 'Work Group', icon: Briefcase },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'sports_group', label: 'Sports Group', icon: Trophy },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

const IMPORT_OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp Group', icon: MessageCircle, color: 'text-green-500' },
  { id: 'facebook', label: 'Facebook Group', icon: Facebook, color: 'text-blue-600' },
  { id: 'telegram', label: 'Telegram Group', icon: Send, color: 'text-sky-500' },
  { id: 'discord', label: 'Discord Server', icon: MessageCircle, color: 'text-indigo-600' },
  { id: 'other', label: 'Other', icon: Link2, color: 'text-muted-foreground' },
];

export function CreateBubbleFlow() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    description: '',
    type: 'friend_group',
    category: '',
    coverImageUrl: '',
    imageUrl: '',
    visibility: 'public',
  });

  const canContinue = () => {
    if (step === 1) {
      return form.name.length >= 2 && form.description.length >= 10;
    }
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bubbles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'Could not create bubble.');
      toast.push('Bubble created successfully!');
      router.push(`/bubbles/${payload.data._id}`);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not create bubble.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex flex-col items-center border-b bg-background px-4 py-4">
        <div className="flex w-full items-center justify-between">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-[18px] font-black leading-tight">Create Bubble</h1>
            <p className="text-[12px] text-muted-foreground">Build your community. Set your impact.</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Steps Progress */}
        <div className="mt-6 flex w-full max-w-sm items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="relative flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black transition-colors",
                  step >= s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {s.id}
                </div>
                <span className={cn(
                  "mt-1 text-[10px] font-bold",
                  step === s.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "mx-2 h-[2px] flex-1 -translate-y-2.5",
                  step > s.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-[20px] font-black">Bubble Identity</h2>
                <p className="text-[13px] text-muted-foreground">Add the basics about your community.</p>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider">Cover Image <span className="text-red-500">*</span></label>
                <div className="relative flex aspect-[16/6] w-full flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border bg-muted/30">
                  <Upload size={32} className="text-muted-foreground" />
                  <p className="mt-2 text-[13px] font-bold">Upload cover image</p>
                  <p className="text-[11px] text-muted-foreground">Recommended size: 1600 x 600 px</p>
                  {form.coverImageUrl && <img src={form.coverImageUrl} alt="Cover" className="absolute inset-0 h-full w-full rounded-[20px] object-cover" />}
                </div>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4">
                {/* Bubble Image Upload */}
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Bubble Image <span className="text-red-500">*</span></label>
                  <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border bg-muted/30">
                    <Users size={24} className="text-muted-foreground" />
                    <p className="mt-1 text-center text-[10px] font-bold leading-tight">Upload Image</p>
                    <p className="text-[9px] text-muted-foreground">512 x 512 px</p>
                    {form.imageUrl && <img src={form.imageUrl} alt="Bubble" className="absolute inset-0 h-full w-full rounded-[20px] object-cover" />}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Bubble Name */}
                  <div className="space-y-2">
                    <label className="text-[12px] font-black uppercase tracking-wider">Bubble Name <span className="text-red-500">*</span></label>
                    <input 
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="e.g. Dream Chasers"
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="text-right text-[10px] text-muted-foreground">{form.name.length}/50</div>
                  </div>

                  {/* Tagline */}
                  <div className="space-y-2">
                    <label className="text-[12px] font-black uppercase tracking-wider">Tagline <span className="text-muted-foreground">(Optional)</span></label>
                    <input 
                      value={form.tagline}
                      onChange={e => setForm({...form, tagline: e.target.value})}
                      placeholder="e.g. Building a better future, together."
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="text-right text-[10px] text-muted-foreground">{form.tagline.length}/80</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider">Description <span className="text-red-500">*</span></label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe your bubble, its purpose and what members can expect."
                  className="min-h-[120px] w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="text-right text-[10px] text-muted-foreground">{form.description.length}/300</div>
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Type <span className="text-red-500">*</span></label>
                  <select 
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none"
                  >
                    {BUBBLE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Category <span className="text-muted-foreground">(Optional)</span></label>
                  <select 
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none"
                  >
                    <option value="">Select category</option>
                    <option value="education">Education</option>
                    <option value="tech">Technology</option>
                    <option value="social">Social</option>
                  </select>
                </div>
              </div>

              {/* Bubble Type Selection (Icon Grid) */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {BUBBLE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm({...form, type: t.id})}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border px-4 py-3 transition-all",
                      form.type === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                    )}
                  >
                    <t.icon size={20} className={form.type === t.id ? "text-primary" : "text-muted-foreground"} />
                    <span className="mt-2 whitespace-nowrap text-[10px] font-bold">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Created By / Visibility */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Created By <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div>
                      <p className="text-[12px] font-black">Aanya Verma</p>
                      <p className="text-[10px] text-muted-foreground">@aanyaverma</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-wider">Visibility <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <Globe size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[12px] font-black capitalize">{form.visibility}</p>
                      <p className="text-[10px] text-muted-foreground">Anyone can find and request</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import From */}
              <div className="space-y-3 pt-2">
                <label className="text-[12px] font-black uppercase tracking-wider">Import from <span className="text-muted-foreground">(Optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {IMPORT_OPTIONS.map(opt => (
                    <button key={opt.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted">
                      <opt.icon size={16} className={opt.color} />
                      <span className="text-[12px] font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className="w-full rounded-full bg-primary py-4 text-[16px] font-black text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Continue
              </button>
              <p className="text-center text-[12px] text-muted-foreground">You can add members and settings in the next steps.</p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center space-y-6 pt-10"
            >
              <Users size={64} className="text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-[20px] font-black">Add Members</h2>
                <p className="text-[13px] text-muted-foreground">Invite people to join your bubble.</p>
              </div>
              <button onClick={handleNext} className="w-full rounded-full bg-primary py-4 text-[16px] font-black text-primary-foreground shadow-lg">Next</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center space-y-6 pt-10"
            >
              <Building2 size={64} className="text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-[20px] font-black">Bubble Settings</h2>
                <p className="text-[13px] text-muted-foreground">Configure how your bubble operates.</p>
              </div>
              <button onClick={handleNext} className="w-full rounded-full bg-primary py-4 text-[16px] font-black text-primary-foreground shadow-lg">Next</button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <CheckCircle2 size={64} className="mx-auto text-primary" />
                <h2 className="mt-4 text-[20px] font-black">Review & Create</h2>
                <p className="text-[13px] text-muted-foreground">Everything looks good! Ready to launch?</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden">
                    {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black">{form.name}</h3>
                    <p className="text-[12px] text-muted-foreground">{form.tagline}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <p className="font-black text-muted-foreground uppercase text-[10px]">Type</p>
                    <p className="font-bold">{form.type}</p>
                  </div>
                  <div>
                    <p className="font-black text-muted-foreground uppercase text-[10px]">Visibility</p>
                    <p className="font-bold">{form.visibility}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full rounded-full bg-primary py-4 text-[16px] font-black text-primary-foreground shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Bubble'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
