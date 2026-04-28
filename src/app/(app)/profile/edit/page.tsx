'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Camera, 
  Trash2, 
  Plus, 
  Youtube, 
  Instagram, 
  Twitter, 
  Globe,
  Star,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  Heart,
  History,
  Handshake,
  ArrowRight
} from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const multipliers = [
  { id: 'massive_action', label: 'Massive Action', icon: Zap, options: ['Setting (0.5x)', 'Making (1.0x)', 'High (2.0x)', 'Massive (3.0x)'] },
  { id: 'people_multiplier', label: 'People Multiplier', icon: Users, options: ['1k+', '10k+', '100k+', '1M+', '50M+'] },
  { id: 'reach_multiplier', label: 'Reach Multiplier', icon: Globe, options: ['Local', 'Regional', 'National', 'Global'] },
  { id: 'impact_multiplier', label: 'Impact Multiplier', icon: Star, options: ['Small', 'Moderate', 'High', 'Transformational'] },
  { id: 'credibility_multiplier', label: 'Credibility Multiplier', icon: ShieldCheck, options: ['Building', 'Trusted', 'Highly Trusted', 'Iconic'] },
  { id: 'momentum_multiplier', label: 'Momentum Multiplier', icon: TrendingUp, options: ['Starting', 'Growing', 'Accelerating', 'Exponential'] },
  { id: 'innovation_multiplier', label: 'Innovation Multiplier', icon: Lightbulb, options: ['Traditional', 'Improving', 'Innovative', 'Disruptive'] },
  { id: 'community_multiplier', label: 'Community Multiplier', icon: Heart, options: ['Small Group', 'Active', 'Strong', 'Massive Movement'] },
  { id: 'resource_multiplier', label: 'Resource Multiplier', icon: Handshake, options: ['Limited', 'Some', 'Strong', 'Abundant'] },
  { id: 'legacy_multiplier', label: 'Legacy Multiplier', icon: History, options: ['Short-term', 'Medium-term', 'Long-term', 'Generational'] },
];

export default function EditProfilePage() {
  const [selectedMultipliers, setSelectedMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(multipliers.map(m => [m.id, m.options.length - 1]))
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <button className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-bold">Edit Profile</h1>
        <Button size="sm">Save</Button>
      </header>

      {/* Profile Photo */}
      <section className="flex flex-col items-center py-8">
        <div className="relative group">
          <div className="h-32 w-32 rounded-full border-2 border-border p-1 bg-card">
            <img 
              src="https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=128&h=128&fit=crop" 
              alt="Profile" 
              className="h-full w-full rounded-full object-cover" 
            />
          </div>
          <button className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center border-4 border-background hover:scale-110 transition-transform">
            <Camera size={20} />
          </button>
        </div>
        <p className="mt-4 text-[13px] font-bold text-muted-foreground">Profile Photo</p>
        <p className="text-[11px] text-muted-foreground/60">JPG, PNG or WEBP. Max 5MB.</p>
        <button className="mt-2 text-[12px] font-bold text-foreground">Change Photo</button>
      </section>

      {/* Basic Information */}
      <section className="px-4 space-y-6">
        <h2 className="text-[12px] font-bold uppercase tracking-[2px] text-muted-foreground">Basic Information</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Display Name</label>
            <Input defaultValue="MrBeast" />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Username</label>
            <Input defaultValue="mrbeast" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-bold ml-1">Headline</label>
          <Input defaultValue="YouTuber, Entrepreneur, Philanthropist" />
          <p className="text-right text-[10px] text-muted-foreground">41/60</p>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-bold ml-1">Bio</label>
          <Textarea defaultValue="I make videos and do crazy challenges, but my biggest goal is simple: make the world a better place." />
          <p className="text-right text-[10px] text-muted-foreground">92/200</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Category</label>
            <div className="relative">
              <Input defaultValue="Content Creator / Philanthropist" readOnly />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Primary Focus</label>
            <div className="relative">
              <Input defaultValue="Poverty, Hunger, Education, Clean Water" readOnly />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1 text-muted-foreground">Based In</label>
            <div className="relative">
              <Input defaultValue="Greenville, North Carolina, USA" className="pl-10" />
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Profile Visibility</label>
            <div className="relative">
              <Input defaultValue="Public" readOnly />
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
          </div>
        </div>
      </section>

      {/* The 10X Multipliers */}
      <section className="mt-12 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-bold uppercase tracking-[2px] text-muted-foreground">The 10X Multipliers</h2>
          <span className="text-muted-foreground text-[14px]">ⓘ</span>
        </div>
        <p className="text-[12px] text-muted-foreground">Choose the attributes that best represent your impact.</p>

        <div className="space-y-8">
          {multipliers.map((m) => (
            <div key={m.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-foreground border border-border">
                  <m.icon size={16} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold">{m.label}</h4>
                  <p className="text-[11px] text-muted-foreground">What level of action is this?</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {m.options.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedMultipliers({...selectedMultipliers, [m.id]: i})}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[11px] font-bold border transition-all",
                      selectedMultipliers[m.id] === i
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt}
                    {selectedMultipliers[m.id] === i && <ShieldCheck size={10} className="inline ml-1" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other Links */}
      <section className="mt-12 px-4 space-y-6">
        <h2 className="text-[12px] font-bold uppercase tracking-[2px] text-muted-foreground">Other Links</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />
            <Input defaultValue="youtube.com/mrbeast" className="pl-12" />
          </div>
          <div className="relative">
            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
            <Input defaultValue="instagram.com/mrbeast" className="pl-12" />
          </div>
          <div className="relative">
            <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
            <Input defaultValue="x.com/mrbeast" className="pl-12" />
          </div>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input defaultValue="mrbeast.com" className="pl-12" />
          </div>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-muted/30 w-full py-3 text-[13px] font-bold">
          <Plus size={16} /> Add Platform
        </button>
      </section>

      {/* Delete Profile */}
      <section className="mt-12 px-4 pb-12">
        <button className="flex items-center justify-center gap-2 w-full py-4 text-destructive font-bold text-[14px] hover:bg-destructive/5 rounded-full transition-all">
          <Trash2 size={18} /> Delete Profile
        </button>
      </section>
    </main>
  );
}

function ChevronDown({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
  );
}
