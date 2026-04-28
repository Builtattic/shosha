'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UserPlus, 
  Mail, 
  Globe, 
  AtSign,
  ShieldCheck,
  ChevronRight,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function AddProfileModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
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
          <button onClick={onClose} className="text-muted-foreground">
            <X size={24} />
          </button>
          <h2 className="text-[18px] font-bold">Add Profile to the Platform</h2>
          <div className="w-6" />
        </div>

        <p className="text-[13px] text-muted-foreground text-center mb-8">The person you’re tagging doesn’t exist on our platform.<br/>Add their profile to proceed.</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Full Name *</label>
            <Input placeholder="Enter full name" />
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Email / Contact <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder="Enter contact address or phone number" className="pl-12" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">Link to any Social Media <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder="https://" className="pl-12" />
            </div>
            <p className="text-[10px] text-muted-foreground">Link to public profile (e.g., Twitter, Instagram, LinkedIn)</p>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold ml-1">System Generated Username</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input defaultValue="john_doe_8542" className="pl-12 bg-muted/30" readOnly />
            </div>
            <p className="text-[10px] text-muted-foreground">Username is auto-generated and unique. ⓘ</p>
          </div>

          <div className="pt-4">
            <Button className="w-full" size="lg" onClick={onClose}>
              Confirm & Add Profile
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-4 italic">🔒 Your identity will remain anonymous</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
