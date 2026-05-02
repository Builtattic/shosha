'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronLeft,
  ChevronRight,
  Scan,
  User,
  Smartphone,
  Check
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function ClaimProfileModal({
  open,
  onClose,
  targetUser = { name: 'Alex Honnold', handle: 'alexhonnold', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop' }
}: {
  open: boolean;
  onClose: () => void;
  targetUser?: { name: string, handle: string, avatar: string };
}) {
  const [step, setStep] = useState(1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-background border-x border-t border-border p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-muted-foreground">
            {step > 1 ? <ChevronLeft size={24} /> : <X size={24} />}
          </button>
          <h2 className="text-[18px] font-bold">Claim Profile</h2>
          <div className="w-6" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full border-2 border-border p-1 bg-card mb-4">
                  <img src={targetUser.avatar} alt={targetUser.name} className="h-full w-full rounded-full object-cover" />
                </div>
                <h3 className="text-[18px] font-bold">{targetUser.name}</h3>
                <p className="text-[14px] text-muted-foreground">{targetUser.handle}</p>
              </div>

              <p className="text-[13px] text-muted-foreground text-center">To claim this profile, please verify your identity. We’ll send the credentials to your email after successful verification.</p>

              <div className="space-y-2">
                <label className="text-[12px] font-bold ml-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input placeholder="team@shoshaworld.com" className="pl-12" />
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                  Claim Now
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-4 italic">🔒 Your identity will remain private</p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[18px] font-bold">Verify Your Identity</h3>
                <span className="text-muted-foreground"><X size={20} /></span>
              </div>
              <p className="text-[13px] text-muted-foreground">Upload a government ID to verify your identity.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                   <div className="flex flex-col items-center justify-center p-3 border border-border rounded-[16px] bg-card opacity-50">
                      <Scan size={20} />
                      <span className="text-[10px] font-bold mt-1">Passport</span>
                   </div>
                   <div className="flex flex-col items-center justify-center p-3 border border-primary bg-primary/5 rounded-[16px]">
                      <Scan size={20} className="text-primary" />
                      <span className="text-[10px] font-bold mt-1 text-primary">Driver&apos;s License</span>
                   </div>
                   <div className="flex flex-col items-center justify-center p-3 border border-border rounded-[16px] bg-card opacity-50">
                      <Scan size={20} />
                      <span className="text-[10px] font-bold mt-1">National ID</span>
                   </div>
                </div>

                <div className="aspect-[1.6/1] w-full rounded-[20px] border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted transition-all cursor-pointer">
                   <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Smartphone size={24} className="text-muted-foreground" />
                   </div>
                   <div className="text-center">
                      <p className="text-[14px] font-bold">Upload front side</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF (Max 10MB)</p>
                   </div>
                </div>

                <Button className="w-full" size="lg" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-[18px] font-bold text-center">Liveness Check</h3>
              <p className="text-[13px] text-muted-foreground text-center">Take a quick selfie video to confirm you’re a real person.</p>

              <div className="flex justify-center py-4">
                 <div className="relative">
                    <div className="h-48 w-48 rounded-full border-4 border-primary/20 p-2">
                       <div className="h-full w-full rounded-full border-4 border-primary overflow-hidden relative">
                          <img src={targetUser.avatar} alt="Liveness" className="h-full w-full object-cover grayscale opacity-50" />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <div className="h-full w-full border-[10px] border-primary/30 rounded-full animate-pulse"></div>
                          </div>
                       </div>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-background px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                       Scanning...
                    </div>
                 </div>
              </div>

              <div className="text-center space-y-1">
                 <p className="text-[14px] font-bold">Look at the camera and slowly turn your head</p>
              </div>

              <Button className="w-full" size="lg" onClick={() => setStep(4)}>
                Done
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-8 py-8 flex flex-col items-center text-center"
            >
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                 <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-background">
                    <Check size={32} strokeWidth={3} />
                 </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[20px] font-bold text-primary">Verification Submitted</h3>
                <p className="text-[13px] text-muted-foreground px-8">
                   Once approved, we&apos;ll send the login credentials to 
                   <span className="text-foreground font-bold"> team@shoshaworld.com</span>. 
                   Usually takes up to 24-48 hours.
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={onClose}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
