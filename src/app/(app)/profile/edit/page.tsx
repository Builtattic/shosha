'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Camera, 
  Trash2, 
  Youtube, 
  Instagram, 
  Globe,
  Star,
  Users,
  Shield,
  Target,
  Rocket,
  Lightbulb,
  Heart,
  DollarSign,
  Sprout,
  Check,
  MapPin,
  ChevronDown,
  ClipboardPaste
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const multipliers = [
  { id: 'massiveAction', label: '1. Massive Action', desc: 'What actions have you taken at scale?', icon: Star, options: ['Getting Started', 'Making Moves', 'High Impact', 'Massive'] },
  { id: 'peopleMultiplier', label: '2. People Multiplier', desc: 'How many people have you reached or helped?', icon: Users, options: ['1K+', '10K+', '100K+', '1M+', '10M+', '50M+'] },
  { id: 'reachMultiplier', label: '3. Reach Multiplier', desc: 'How wide is your influence?', icon: Globe, options: ['Local', 'Regional', 'National', 'Global'] },
  { id: 'impactMultiplier', label: '4. Impact Multiplier', desc: 'What real-world impact have you created?', icon: Target, options: ['Small', 'Moderate', 'High', 'Transformational'] },
  { id: 'credibilityMultiplier', label: '5. Credibility Multiplier', desc: 'Why should people trust you?', icon: Shield, options: ['Building', 'Trusted', 'Highly Trusted', 'Iconic'] },
  { id: 'momentumMultiplier', label: '6. Momentum Multiplier', desc: 'How fast is your impact growing?', icon: Rocket, options: ['Starting', 'Growing', 'Accelerating', 'Exponential'] },
  { id: 'innovationMultiplier', label: '7. Innovation Multiplier', desc: 'What makes your approach unique?', icon: Lightbulb, options: ['Traditional', 'Improving', 'Innovative', 'Disruptive'] },
  { id: 'communityMultiplier', label: '8. Community Multiplier', desc: 'Do you build and engage communities?', icon: Heart, options: ['Small Group', 'Active', 'Strong', 'Massive Movement'] },
  { id: 'resourceMultiplier', label: '9. Resource Multiplier', desc: 'What resources do you bring to the table?', icon: DollarSign, options: ['Limited', 'Some', 'Strong', 'Abundant'] },
  { id: 'legacyMultiplier', label: '10. Legacy Multiplier', desc: 'What lasting change are you building?', icon: Sprout, options: ['Short-term', 'Medium-term', 'Long-term', 'Generational'] },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    headline: '',
    bio: '',
    category: '',
    primaryFocus: '',
    city: '',
    profileVisibility: 'Public',
    massiveAction: '',
    peopleMultiplier: '',
    reachMultiplier: '',
    impactMultiplier: '',
    credibilityMultiplier: '',
    momentumMultiplier: '',
    innovationMultiplier: '',
    communityMultiplier: '',
    resourceMultiplier: '',
    legacyMultiplier: '',
    ytUrl: '',
    igUrl: '',
    xUrl: '',
    websiteUrl: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/sign-in?redirect=/profile/edit');
      return;
    }

    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        const u = data.data?.user;
        if (u) {
          setForm((f) => ({
            ...f,
            name: u.name || '',
            username: u.username || '',
            headline: u.headline || '',
            bio: u.bio || '',
            category: u.category || '',
            primaryFocus: u.primaryFocus || '',
            city: u.city || '',
            profileVisibility: u.profileVisibility || 'Public',
            massiveAction: u.massiveAction || '',
            peopleMultiplier: u.peopleMultiplier || '',
            reachMultiplier: u.reachMultiplier || '',
            impactMultiplier: u.impactMultiplier || '',
            credibilityMultiplier: u.credibilityMultiplier || '',
            momentumMultiplier: u.momentumMultiplier || '',
            innovationMultiplier: u.innovationMultiplier || '',
            communityMultiplier: u.communityMultiplier || '',
            resourceMultiplier: u.resourceMultiplier || '',
            legacyMultiplier: u.legacyMultiplier || '',
            ytUrl: u.ytUrl || '',
            igUrl: u.igUrl || '',
            xUrl: u.xUrl || '',
            websiteUrl: u.websiteUrl || '',
            photoUrl: (u.photoUrl && u.photoUrl !== 'null' && u.photoUrl !== 'undefined') 
              ? u.photoUrl 
              : 'https://api.dicebear.com/9.x/initials/svg?seed=' + (u.name || 'User') + '&backgroundColor=1a1a1a&textColor=ffffff',
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authLoading, user, router]);

  const updateField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const pasteIntoField = async (key: 'ytUrl' | 'igUrl' | 'xUrl' | 'websiteUrl') => {
    setError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      updateField(key, text.trim());
    } catch {
      setError('Clipboard access was blocked. Tap the field and use your keyboard paste option.');
    }
  };

  const linkInputClass = "w-full min-w-0 bg-transparent text-[13px] font-medium outline-none text-foreground select-text";

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      router.push('/profile');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSaving(true);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.data?.url) {
        setForm((f) => ({ ...f, photoUrl: data.data.url }));
      } else {
        setError(data.error?.message || 'Failed to upload photo');
      }
    } catch (err) {
      setError('Photo upload failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background safe-bottom font-sans max-w-xl mx-auto border-x border-border/50 shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-background sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/95">
        <button onClick={() => router.back()} className="text-foreground hover:opacity-80">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold text-foreground">Edit Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="px-5 py-1.5 rounded-full bg-foreground text-background font-bold text-[13px] hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Saving' : 'Save'}
        </button>
      </header>

      {error && <div className="px-4 py-2 bg-destructive/10 text-destructive text-[13px] font-medium m-4 rounded-xl">{error}</div>}

      {/* Profile Photo */}
      <section className="flex flex-col items-center py-6">
        <div className="relative group">
          <div className="h-28 w-28 rounded-full border border-border p-1 bg-card overflow-hidden relative">
            <img 
              src={form.photoUrl} 
              alt="Profile" 
              className="h-full w-full rounded-full object-cover transition-opacity duration-300" 
              onError={(e) => {
                const target = e.currentTarget;
                target.style.opacity = '0';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div 
              className="absolute inset-0 items-center justify-center bg-primary/10 text-primary font-black text-2xl hidden rounded-full"
              style={{ display: 'none' }}
            >
              {(form.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-background text-foreground flex items-center justify-center border border-border cursor-pointer shadow-md hover:scale-105 transition-transform">
            <Camera size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>
        <p className="mt-4 text-[13px] font-bold text-foreground">Profile Photo</p>
        <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
        <label className="mt-2 text-[12px] font-bold text-foreground bg-muted/60 px-3 py-1 rounded-full cursor-pointer hover:bg-muted">
          Change Photo
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </label>
      </section>

      {/* Basic Information */}
      <section className="px-4 space-y-4">
        <h2 className="text-[13px] font-bold text-foreground">Basic Information</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-border rounded-xl bg-card">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Display Name</label>
            <input 
              value={form.name} 
              onChange={(e) => updateField('name', e.target.value)} 
              className="w-full bg-transparent text-[14px] font-medium outline-none text-foreground"
              placeholder="Display Name"
            />
          </div>
          <div className="p-3 border border-border rounded-xl bg-card">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Username</label>
            <input 
              value={form.username} 
              onChange={(e) => updateField('username', e.target.value)} 
              className="w-full bg-transparent text-[14px] font-medium outline-none text-foreground"
              placeholder="handle"
            />
          </div>
        </div>

        <div className="p-3 border border-border rounded-xl bg-card relative">
          <label className="block text-[11px] text-muted-foreground font-medium mb-1">Headline</label>
          <input 
            value={form.headline} 
            onChange={(e) => updateField('headline', e.target.value)} 
            className="w-full bg-transparent text-[14px] font-medium outline-none text-foreground pr-12"
            placeholder="Headline (e.g. Creator, Entrepreneur)"
            maxLength={80}
          />
          <span className="absolute right-3 bottom-3 text-[10px] text-muted-foreground">{form.headline.length}/80</span>
        </div>

        <div className="p-3 border border-border rounded-xl bg-card relative">
          <label className="block text-[11px] text-muted-foreground font-medium mb-1">Bio</label>
          <textarea 
            value={form.bio} 
            onChange={(e) => updateField('bio', e.target.value)} 
            className="w-full bg-transparent text-[14px] font-medium outline-none text-foreground resize-none h-20 pr-12"
            placeholder="Write a short bio..."
            maxLength={200}
          />
          <span className="absolute right-3 bottom-3 text-[10px] text-muted-foreground">{form.bio.length}/200</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-border rounded-xl bg-card relative flex flex-col justify-center">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full bg-transparent text-[13px] font-medium outline-none text-foreground appearance-none pr-8 cursor-pointer"
            >
              <option value="">Select Category</option>
              <option value="Content Creator / Philanthropist">Content Creator / Philanthropist</option>
              <option value="Entrepreneur / Tech">Entrepreneur / Tech</option>
              <option value="Artist / Musician">Artist / Musician</option>
              <option value="Public Figure">Public Figure</option>
              <option value="Activist / Advocate">Activist / Advocate</option>
              <option value="Educator / Academic">Educator / Academic</option>
              <option value="Journalist / Media">Journalist / Media</option>
              <option value="Politician / Government">Politician / Government</option>
              <option value="Nonprofit / NGO">Nonprofit / NGO</option>
              <option value="Athlete / Sports">Athlete / Sports</option>
              <option value="Healthcare / Medicine">Healthcare / Medicine</option>
              <option value="Finance / Investor">Finance / Investor</option>
              <option value="Legal / Justice">Legal / Justice</option>
              <option value="Scientist / Researcher">Scientist / Researcher</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          </div>

          <div className="p-3 border border-border rounded-xl bg-card relative flex flex-col justify-center">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Primary Focus</label>
            <select
              value={form.primaryFocus}
              onChange={(e) => updateField('primaryFocus', e.target.value)}
              className="w-full bg-transparent text-[13px] font-medium outline-none text-foreground appearance-none pr-8 cursor-pointer"
            >
              <option value="">Select Focus</option>
              <option value="Poverty, Hunger, Education, Clean Water">Poverty, Hunger, Education, Clean Water</option>
              <option value="AI / Innovation">AI / Innovation</option>
              <option value="Mental Health">Mental Health</option>
              <option value="Economic Growth">Economic Growth</option>
              <option value="Climate / Environment">Climate / Environment</option>
              <option value="Healthcare / Public Health">Healthcare / Public Health</option>
              <option value="Human Rights / Justice">Human Rights / Justice</option>
              <option value="Gender Equality">Gender Equality</option>
              <option value="Youth Empowerment">Youth Empowerment</option>
              <option value="Financial Inclusion">Financial Inclusion</option>
              <option value="Media / Free Press">Media / Free Press</option>
              <option value="Technology Access">Technology Access</option>
              <option value="Community Development">Community Development</option>
              <option value="Governance / Anti-Corruption">Governance / Anti-Corruption</option>
              <option value="Arts / Cultural Preservation">Arts / Cultural Preservation</option>
              <option value="Animal Welfare">Animal Welfare</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-border rounded-xl bg-card relative flex flex-col justify-center">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Based in</label>
            <div className="flex items-center gap-2">
              <input 
                value={form.city} 
                onChange={(e) => updateField('city', e.target.value)} 
                className="w-full bg-transparent text-[13px] font-medium outline-none text-foreground pr-6"
                placeholder="City, Country"
              />
              <MapPin className="text-muted-foreground flex-shrink-0" size={16} />
            </div>
          </div>

          <div className="p-3 border border-border rounded-xl bg-card relative flex flex-col justify-center">
            <label className="block text-[11px] text-muted-foreground font-medium mb-1">Profile Visibility</label>
            <select
              value={form.profileVisibility}
              onChange={(e) => updateField('profileVisibility', e.target.value)}
              className="w-full bg-transparent text-[13px] font-medium outline-none text-foreground appearance-none pr-8 cursor-pointer"
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          </div>
        </div>
      </section>

      {/* The 10X Multipliers */}
      <section className="mt-8 px-4 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold text-foreground">The 10X Multipliers</h2>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">Choose the attributes that best represent your impact.</p>

        <div className="space-y-6 mt-4">
          {multipliers.map((m) => (
            <div key={m.id} className="space-y-2 border-b border-border/30 pb-4 last:border-0">
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 mt-0.5 border border-green-500/20">
                  <m.icon size={15} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-foreground">{m.label}</h4>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 pt-1 pl-9">
                {m.options.map((opt) => {
                  const isSelected = form[m.id as keyof typeof form] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => updateField(m.id, opt)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 shadow-sm",
                        isSelected
                          ? "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400"
                          : "bg-card border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt}
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other Links */}
      <section className="mt-8 px-4 space-y-4">
        <h2 className="text-[13px] font-bold text-foreground">Other Links</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
            <Youtube className="text-red-500 flex-shrink-0" size={18} />
            <input 
              type="url"
              inputMode="url"
              autoComplete="url"
              value={form.ytUrl} 
              onChange={(e) => updateField('ytUrl', e.target.value)} 
              className={linkInputClass}
              placeholder="youtube.com/channel"
            />
            <button type="button" onClick={() => pasteIntoField('ytUrl')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground" aria-label="Paste YouTube link">
              <ClipboardPaste size={15} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
            <Instagram className="text-pink-500 flex-shrink-0" size={18} />
            <input 
              type="url"
              inputMode="url"
              autoComplete="url"
              value={form.igUrl} 
              onChange={(e) => updateField('igUrl', e.target.value)} 
              className={linkInputClass}
              placeholder="instagram.com/username"
            />
            <button type="button" onClick={() => pasteIntoField('igUrl')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground" aria-label="Paste Instagram link">
              <ClipboardPaste size={15} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
            <span className="text-foreground font-black text-[15px] flex-shrink-0 w-[18px] text-center">𝕏</span>
            <input 
              type="url"
              inputMode="url"
              autoComplete="url"
              value={form.xUrl} 
              onChange={(e) => updateField('xUrl', e.target.value)} 
              className={linkInputClass}
              placeholder="x.com/username"
            />
            <button type="button" onClick={() => pasteIntoField('xUrl')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground" aria-label="Paste X link">
              <ClipboardPaste size={15} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
            <Globe className="text-muted-foreground flex-shrink-0" size={18} />
            <input 
              type="url"
              inputMode="url"
              autoComplete="url"
              value={form.websiteUrl} 
              onChange={(e) => updateField('websiteUrl', e.target.value)} 
              className={linkInputClass}
              placeholder="website.com"
            />
            <button type="button" onClick={() => pasteIntoField('websiteUrl')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground" aria-label="Paste website link">
              <ClipboardPaste size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Delete Profile */}
      <section className="mt-12 px-4">
        <button 
          onClick={() => {
            if (confirm('Are you sure you want to delete your profile? This cannot be undone.')) {
              // Delete logic
            }
          }}
          className="flex items-center justify-center gap-2 w-full py-3.5 text-red-500 hover:bg-red-500/5 font-bold text-[13px] rounded-xl border border-red-500/20 transition-all bg-red-500/[0.02]"
        >
          <Trash2 size={16} /> Delete Profile
        </button>
      </section>
    </main>
  );
}
