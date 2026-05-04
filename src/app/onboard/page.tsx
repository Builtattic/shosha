'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight, ArrowLeft, CheckCircle2, User, Briefcase, Link2,
  Instagram, Youtube, Facebook, Linkedin, Twitter, Sparkles
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1 – Basic info
  name: string;
  username: string;
  phone: string;
  dob: string;
  city: string;
  country: string;
  // Step 2 – Profile
  occupationRole: string;
  networkSize: string;
  education: string;
  specializedField: string;
  managesMoneyPeopleSystem: string;
  physicalIntellectualLimitations: string;
  // Step 3 – Social URLs
  igUrl: string;
  tiktokUrl: string;
  xUrl: string;
  linkedinUrl: string;
  redditUrl: string;
  ytUrl: string;
  fbUrl: string;
  snapchatUrl: string;
}

// ── Option maps ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'individual_contributor', label: 'Individual Contributor / Job' },
  { value: 'manager', label: 'Manager' },
  { value: 'founder_business_owner', label: 'Founder / Business Owner' },
  { value: 'public_figure_influencer', label: 'Public Figure / Influencer' },
  { value: 'government_political', label: 'Government / Political Role' },
];

const NETWORK_SIZES = [
  { value: 'none', label: 'None' },
  { value: '<1k', label: '< 1K' },
  { value: '1k-10k', label: '1K – 10K' },
  { value: '10k-100k', label: '10K – 100K' },
  { value: '100k-1m', label: '100K – 1M' },
  { value: '1m-100m', label: '1M – 100M' },
  { value: '100m+', label: '100M+' },
];

const EDUCATION_LEVELS = [
  { value: 'no_formal', label: 'No Formal Education' },
  { value: 'school', label: 'School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'doctorate_specialized', label: 'Doctorate / Specialized' },
];

const SPECIALIZED_FIELD = [
  { value: 'no', label: 'No' },
  { value: 'some_experience', label: 'Some Experience' },
  { value: 'professional', label: 'Professional' },
  { value: 'expert', label: 'Expert' },
];

const MANAGEMENT_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'small_team_limited_control', label: 'Small Team; Limited Control' },
  { value: 'moderate_responsibility', label: 'Moderate Responsibility' },
  { value: 'large_team_major_decisions', label: 'Large Team, Major Decisions' },
  { value: 'organizational_institutional', label: 'Organizational / Institutional Control' },
];

const LIMITATIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

// ── Animations ─────────────────────────────────────────────────────────────────

const stepContainerVariants = {
  enter: { opacity: 0, x: 20 },
  center: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as any,
      staggerChildren: 0.08
    }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.3 }
  },
};

const itemVariants = {
  enter: { opacity: 0, y: 15 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as any } }
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{children}</label>;
}

function TextInput({
  value, onChange, placeholder, type = 'text', required
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <motion.div whileTap={{ scale: 0.995 }} className="relative group">
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border/60 bg-card/50 px-4 py-3.5 text-sm outline-none transition-all duration-300 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50 hover:border-border"
      />
    </motion.div>
  );
}

function SelectGrid({
  options, value, onChange
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all duration-300 ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'border-border/60 bg-card/50 text-foreground hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function UrlInput({
  icon, label, value, onChange, placeholder
}: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const isFilled = value.trim().length > 0;
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className={`flex items-center gap-3 rounded-2xl border bg-card/50 px-4 py-3 transition-all duration-300 focus-within:bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 hover:border-border ${isFilled ? 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/5' : 'border-border/60'}`}>
      <span className={`shrink-0 transition-colors duration-300 ${isFilled ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-1">{label}</p>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 font-medium"
        />
      </div>
    </motion.div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'About You', icon: <User size={14} /> },
    { n: 2, label: 'Profile', icon: <Briefcase size={14} /> },
    { n: 3, label: 'Presence', icon: <Link2 size={14} /> },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-10 relative">
      {steps.map((s, i) => {
        const isActive = step === s.n;
        const isPast = step > s.n;
        
        return (
          <div key={s.n} className="flex items-center">
            <motion.div 
              layout
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-500 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                  : isPast
                  ? 'bg-foreground text-background'
                  : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {isPast ? <CheckCircle2 size={14} /> : s.icon}
              <motion.span layout className="hidden sm:inline-block">{s.label}</motion.span>
            </motion.div>
            {i < steps.length - 1 && (
              <div className="w-8 sm:w-16 h-1 mx-2 rounded-full bg-muted/50 overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-foreground"
                  initial={{ width: '0%' }}
                  animate={{ width: isPast ? '100%' : '0%' }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  const [form, setForm] = useState<FormData>({
    name: '', username: '', phone: '', dob: '', city: '', country: '',
    occupationRole: '', networkSize: '', education: '', specializedField: '',
    managesMoneyPeopleSystem: '', physicalIntellectualLimitations: '',
    igUrl: '', tiktokUrl: '', xUrl: '', linkedinUrl: '', redditUrl: '',
    ytUrl: '', fbUrl: '', snapchatUrl: '',
  });

  // Pre-fill name from Firebase user
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.displayName || '',
        username: f.username || (user.email?.split('@')[0] ?? ''),
        phone: f.phone || user.phoneNumber || '',
      }));
    }
  }, [user]);

  // Redirect to sign-in if not authenticated; pre-fill form from existing profile
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/sign-in?redirect=/onboard');
      return;
    }
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u) {
          // Pre-fill form with any existing profile data so returning users
          // can edit their profile without starting from scratch.
          setForm((f) => ({
            ...f,
            name: u.name || f.name,
            username: u.username || f.username,
            phone: u.phone || f.phone,
            dob: u.dob || f.dob,
            city: u.city || f.city,
            country: u.country || f.country,
            occupationRole: u.occupationRole || f.occupationRole,
            networkSize: u.networkSize || f.networkSize,
            education: u.education || f.education,
            specializedField: u.specializedField || f.specializedField,
            managesMoneyPeopleSystem: u.managesMoneyPeopleSystem || f.managesMoneyPeopleSystem,
            physicalIntellectualLimitations: u.physicalIntellectualLimitations || f.physicalIntellectualLimitations,
            igUrl: u.igUrl || f.igUrl,
            tiktokUrl: u.tiktokUrl || f.tiktokUrl,
            xUrl: u.xUrl || f.xUrl,
            linkedinUrl: u.linkedinUrl || f.linkedinUrl,
            redditUrl: u.redditUrl || f.redditUrl,
            ytUrl: u.ytUrl || f.ytUrl,
            fbUrl: u.fbUrl || f.fbUrl,
            snapchatUrl: u.snapchatUrl || f.snapchatUrl,
          }));
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [loading, user, router]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep1() {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!form.username.trim()) return 'Please enter a username.';
    if (!/^[a-z0-9_]{2,30}$/.test(form.username.trim())) return 'Username: 2–30 chars, lowercase letters, numbers, underscores only.';
    if (!form.dob) return 'Please enter your date of birth.';
    if (!form.phone.trim()) return 'Please enter your phone number.';
    if (!form.city.trim()) return 'Please enter your city.';
    if (!form.country.trim()) return 'Please enter your country.';
    return null;
  }

  function validateStep2() {
    if (!form.occupationRole) return 'Please select your role.';
    if (!form.networkSize) return 'Please select your network size.';
    if (!form.education) return 'Please select your education level.';
    if (!form.specializedField) return 'Please select your specialization level.';
    if (!form.managesMoneyPeopleSystem) return 'Please select a management level.';
    if (!form.physicalIntellectualLimitations) return 'Please answer the limitations question.';
    return null;
  }

  function handleNext() {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    }
    setStep((s) => (s < 3 ? (s + 1) as Step : s));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    setError('');
    const step1Error = validateStep1();
    if (step1Error) {
      setStep(1);
      setError(step1Error);
      return;
    }
    const step2Error = validateStep2();
    if (step2Error) {
      setStep(2);
      setError(step2Error);
      return;
    }
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, onboardingComplete: true }),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  if (loading || !user || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 rounded-full border-4 border-muted border-t-primary" 
        />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-center bg-card/60 backdrop-blur-xl p-10 rounded-[3rem] border border-border shadow-2xl"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight mb-3">You&apos;re officially in.</h2>
          <p className="text-muted-foreground text-base">Preparing your public ledger...</p>
        </motion.div>
      </div>
    );
  }

  const age = calcAge(form.dob);

  return (
    <main className="min-h-screen bg-background relative flex flex-col items-center justify-start px-4 py-12 sm:py-20 overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center justify-center gap-2">
            Sho<span className="text-primary">शा</span> <Sparkles className="text-primary" size={24} />
          </h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Setup your identity</p>
        </motion.div>

        <ProgressBar step={step} />

        <motion.div 
          layout
          className="rounded-[2.5rem] border border-border/60 bg-card/40 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/5"
        >
          <AnimatePresence mode="wait">

            {/* ── Step 1: About You ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" variants={stepContainerVariants} initial="enter" animate="center" exit="exit">
                <motion.div variants={itemVariants} className="mb-8">
                  <h2 className="text-2xl font-black tracking-tight mb-2">Who are you?</h2>
                  <p className="text-base text-muted-foreground">Let&apos;s start with the basics to build your public profile.</p>
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    {error}
                  </motion.p>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <motion.div variants={itemVariants}>
                      <FieldLabel>Full Name *</FieldLabel>
                      <TextInput required value={form.name} onChange={(v) => set('name', v)} placeholder="Your full name" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <FieldLabel>Username *</FieldLabel>
                      <TextInput required value={form.username} onChange={(v) => set('username', v.toLowerCase())} placeholder="choose_a_handle" />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <motion.div variants={itemVariants}>
                      <FieldLabel>Date of Birth *</FieldLabel>
                      <TextInput required type="date" value={form.dob} onChange={(v) => set('dob', v)} />
                      {age !== null && <p className="text-xs font-medium text-primary mt-2 pl-2">Age: {age} years old</p>}
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <FieldLabel>Phone Number *</FieldLabel>
                      <TextInput required type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+1 (555) 000-0000" />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <motion.div variants={itemVariants}>
                      <FieldLabel>City *</FieldLabel>
                      <TextInput required value={form.city} onChange={(v) => set('city', v)} placeholder="e.g. New York" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <FieldLabel>Country *</FieldLabel>
                      <TextInput required value={form.country} onChange={(v) => set('country', v)} placeholder="e.g. United States" />
                    </motion.div>
                  </div>
                </div>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="mt-10 w-full flex items-center justify-center gap-3 rounded-2xl bg-foreground text-background py-4 font-black text-lg hover:shadow-xl hover:shadow-foreground/20 transition-all"
                >
                  Continue <ArrowRight size={20} />
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 2: Your Profile ──────────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2" variants={stepContainerVariants} initial="enter" animate="center" exit="exit">
                <motion.button 
                  variants={itemVariants}
                  onClick={() => { setStep(1); setError(''); }} 
                  className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft size={16} /> Back to Basics
                </motion.button>
                
                <motion.div variants={itemVariants} className="mb-8">
                  <h2 className="text-2xl font-black tracking-tight mb-2">Define your expertise</h2>
                  <p className="text-base text-muted-foreground">This directly impacts how your influence score is calculated.</p>
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    {error}
                  </motion.p>
                )}

                <div className="space-y-8">
                  <motion.div variants={itemVariants}>
                    <FieldLabel>Primary Role *</FieldLabel>
                    <SelectGrid options={ROLES} value={form.occupationRole} onChange={(v) => set('occupationRole', v)} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FieldLabel>Overall Network / Audience Size *</FieldLabel>
                    <SelectGrid options={NETWORK_SIZES} value={form.networkSize} onChange={(v) => set('networkSize', v)} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FieldLabel>Highest Education Level *</FieldLabel>
                    <SelectGrid options={EDUCATION_LEVELS} value={form.education} onChange={(v) => set('education', v)} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FieldLabel>Expertise in a Specialised Field? *</FieldLabel>
                    <SelectGrid options={SPECIALIZED_FIELD} value={form.specializedField} onChange={(v) => set('specializedField', v)} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FieldLabel>Do you manage money, people, or systems? *</FieldLabel>
                    <SelectGrid options={MANAGEMENT_LEVELS} value={form.managesMoneyPeopleSystem} onChange={(v) => set('managesMoneyPeopleSystem', v)} />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FieldLabel>Any Significant Limitations? (Physical / Intellectual) *</FieldLabel>
                    <SelectGrid options={LIMITATIONS} value={form.physicalIntellectualLimitations} onChange={(v) => set('physicalIntellectualLimitations', v)} />
                  </motion.div>
                </div>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="mt-10 w-full flex items-center justify-center gap-3 rounded-2xl bg-foreground text-background py-4 font-black text-lg hover:shadow-xl hover:shadow-foreground/20 transition-all"
                >
                  Continue <ArrowRight size={20} />
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 3: Your Presence ─────────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" variants={stepContainerVariants} initial="enter" animate="center" exit="exit">
                <motion.button 
                  variants={itemVariants}
                  onClick={() => { setStep(2); setError(''); }} 
                  className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft size={16} /> Back to Expertise
                </motion.button>

                <motion.div variants={itemVariants} className="mb-8">
                  <h2 className="text-2xl font-black tracking-tight mb-2">Connect your presence</h2>
                  <p className="text-base text-muted-foreground">Link your active profiles to build a comprehensive reputation.</p>
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    {error}
                  </motion.p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={itemVariants}><UrlInput icon={<Instagram size={18} />} label="Instagram" value={form.igUrl} onChange={(v) => set('igUrl', v)} placeholder="instagram.com/username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<span className="text-sm font-black">TT</span>} label="TikTok" value={form.tiktokUrl} onChange={(v) => set('tiktokUrl', v)} placeholder="tiktok.com/@username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<Twitter size={18} />} label="X / Twitter" value={form.xUrl} onChange={(v) => set('xUrl', v)} placeholder="x.com/username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<Linkedin size={18} />} label="LinkedIn" value={form.linkedinUrl} onChange={(v) => set('linkedinUrl', v)} placeholder="linkedin.com/in/username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<span className="text-sm font-bold">R/</span>} label="Reddit" value={form.redditUrl} onChange={(v) => set('redditUrl', v)} placeholder="reddit.com/u/username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<Youtube size={18} />} label="YouTube" value={form.ytUrl} onChange={(v) => set('ytUrl', v)} placeholder="youtube.com/@channel" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<Facebook size={18} />} label="Facebook" value={form.fbUrl} onChange={(v) => set('fbUrl', v)} placeholder="facebook.com/username" /></motion.div>
                  <motion.div variants={itemVariants}><UrlInput icon={<span className="text-sm font-black">SC</span>} label="Snapchat" value={form.snapchatUrl} onChange={(v) => set('snapchatUrl', v)} placeholder="snapchat.com/add/username" /></motion.div>
                </div>

                <motion.button
                  variants={itemVariants}
                  whileHover={!saving ? { scale: 1.02 } : {}}
                  whileTap={!saving ? { scale: 0.98 } : {}}
                  onClick={handleSubmit}
                  disabled={saving}
                  className="mt-10 w-full flex items-center justify-center gap-3 rounded-2xl bg-primary text-primary-foreground py-4 font-black text-lg hover:shadow-xl hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Finalizing Ledger...
                    </span>
                  ) : (
                    <>Complete Setup <Sparkles size={20} /></>
                  )}
                </motion.button>

                <motion.p variants={itemVariants} className="text-center text-xs font-medium text-muted-foreground mt-4">
                  These can be updated later from your profile settings.
                </motion.p>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
