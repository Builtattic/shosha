'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ChevronLeft,
  Search,
  Bell,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  User,
  Scan,
  Zap,
  Lock,
  Eye,
  ZapOff,
  Star,
  Users,
  Target,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TrustUpgradePage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0: initial, 1: selfie, 2: id, 3: loading, 4: success

  const handleNext = () => setStep(s => s + 1);

  const completeUpgrade = async () => {
    setStep(3); // Loading
    try {
      const res = await fetch('/api/me/upgrade', { method: 'POST' });
      if (res.ok) {
        setStep(4); // Success
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 2000);
      } else {
        setStep(0);
      }
    } catch {
      setStep(0);
    }
  };

  if (step > 0) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-sm text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <User size={40} className="text-muted-foreground" />
              </div>
              <h2 className="text-[20px] font-bold mb-2">Take a Selfie</h2>
              <p className="text-[13px] text-muted-foreground mb-8">We need to make sure you&apos;re a real person.</p>
              <Button onClick={handleNext} className="w-full rounded-full py-6 font-bold text-[15px]">Open Camera</Button>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-sm text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Scan size={40} className="text-muted-foreground" />
              </div>
              <h2 className="text-[20px] font-bold mb-2">Upload Govt. ID</h2>
              <p className="text-[13px] text-muted-foreground mb-8">Match your selfie with a valid government ID.</p>
              <Button onClick={completeUpgrade} className="w-full rounded-full py-6 font-bold text-[15px]">Upload Document</Button>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
              <Loader2 size={48} className="text-primary animate-spin mb-6" />
              <h2 className="text-[20px] font-bold">Verifying Identity...</h2>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <ShieldCheck size={48} className="text-primary" />
              </div>
              <h2 className="text-[24px] font-bold mb-2">Trust Badge Earned!</h2>
              <p className="text-[14px] text-muted-foreground">Your account has been upgraded.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background safe-bottom">
      <header className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/profile" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </Link>
        <div className="flex-1 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search people, impact, reports..."
              className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={22} className="text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive border border-background"></span>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <h1 className="text-[24px] font-bold mb-1">Trust Account Upgrade</h1>
        <p className="text-[13px] text-muted-foreground mb-8">Unlock more impact. Earn more trust.</p>

        <div className="rounded-[24px] border border-border bg-card p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <ShieldCheck size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold">Trust Badge</h2>
              <p className="text-[12px] text-muted-foreground">Verified you. Trusted by all.</p>
            </div>
          </div>
        </div>

        <section className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[12px] font-bold">1.</div>
            <h2 className="text-[15px] font-bold">Increase Daily Report Limit</h2>
          </div>

          <div className="rounded-[24px] border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Current Limit</p>
                <div className="text-[32px] font-bold">5</div>
                <p className="text-[10px] text-muted-foreground">reports per day</p>
              </div>
              <ArrowRight className="text-muted-foreground" size={24} />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-primary mb-2">Upgraded Limit</p>
                <div className="text-[32px] font-bold text-primary flex items-center justify-center gap-2">
                  20 <TrendingUp size={24} />
                </div>
                <p className="text-[10px] text-muted-foreground">reports per day</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                <CheckCircle2 size={14} className="text-primary" /> Report more
              </div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                <CheckCircle2 size={14} className="text-primary" /> Reach more people
              </div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                <CheckCircle2 size={14} className="text-primary" /> Create more impact
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[12px] font-bold">2.</div>
            <h2 className="text-[15px] font-bold">Get Selfie Verification</h2>
          </div>
          <p className="text-[12px] text-muted-foreground ml-8">Verify your identity. Earn the Trust Badge.</p>

          <div className="rounded-[24px] border border-border bg-card p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center relative">
                  <User size={20} className="text-muted-foreground" />
                  <CheckCircle2 size={14} className="absolute -right-1 -bottom-1 text-primary bg-background rounded-full" />
                </div>
                <p className="text-[10px] font-bold">Step 1<br /><span className="font-normal text-muted-foreground">Take a selfie</span></p>
              </div>
              <div className="flex flex-col items-center gap-3 text-center opacity-50">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Scan size={20} className="text-muted-foreground" />
                </div>
                <p className="text-[10px] font-bold">Step 2<br /><span className="font-normal text-muted-foreground">Upload any Govt. ID</span></p>
              </div>
              <div className="flex flex-col items-center gap-3 text-center opacity-50">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <p className="text-[10px] font-bold">Step 3<br /><span className="font-normal text-muted-foreground">Get your Trust Badge</span></p>
              </div>
            </div>

            <div className="rounded-[20px] bg-primary/5 p-4 border border-primary/10">
              <h4 className="text-[13px] font-bold text-primary mb-3">Trust Badge Benefits</h4>
              <ul className="space-y-2">
                {[
                  "Higher credibility",
                  "More visibility",
                  "Priority in rankings",
                  "Access to higher limits"
                ].map(benefit => (
                  <li key={benefit} className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                    <CheckCircle2 size={12} className="text-primary" /> {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[12px] font-bold">3.</div>
            <h2 className="text-[15px] font-bold">Increase Base Credibility Score</h2>
          </div>
          <p className="text-[12px] text-muted-foreground ml-8">Stronger score. More weight. Greater impact.</p>

          <div className="rounded-[24px] border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Current Score</p>
                <div className="text-[24px] font-bold">80%</div>
                <div className="h-1 w-16 bg-muted rounded-full mt-2 overflow-hidden mx-auto">
                  <div className="h-full bg-orange-400 w-[80%]"></div>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground" size={20} />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-primary mb-2">Upgraded Score</p>
                <div className="text-[24px] font-bold text-primary">100%</div>
                <div className="h-1 w-16 bg-muted rounded-full mt-2 overflow-hidden mx-auto">
                  <div className="h-full bg-primary w-full"></div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 opacity-60">
                <Star size={20} className="text-primary" />
                <p className="text-[8px] font-bold text-center leading-tight">Higher score.<br />More trust.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-[24px] border border-border bg-card p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold">Upgrade to Trust Account</h3>
              <p className="text-[11px] text-muted-foreground">All benefits. Instant unlock.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-bold">$1.99</div>
            <p className="text-[10px] text-muted-foreground">one time</p>
          </div>
          <button onClick={handleNext} className="bg-foreground text-background rounded-full px-6 py-3 text-[14px] font-bold ml-2 transition hover:opacity-90">
            Upgrade Now
          </button>
        </div>

        <div className="mt-12 flex justify-around opacity-60">
          <div className="flex flex-col items-center gap-1">
            <Users size={18} />
            <p className="text-[9px] font-bold text-center">Real people.<br />Real impact.</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ZapOff size={18} />
            <p className="text-[9px] font-bold text-center">No bots.<br />No fake.</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Target size={18} />
            <p className="text-[9px] font-bold text-center">Truth first.<br />Always.</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Lock size={18} />
            <p className="text-[9px] font-bold text-center">Your data.<br />Always private.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
