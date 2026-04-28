'use client';

import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Target, 
  Zap, 
  Users, 
  Heart, 
  Eye, 
  Lightbulb, 
  Shield, 
  Handshake, 
  History 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const drivers = [
  { name: 'Ego Under Control', desc: 'Fame doesn’t change you.', icon: UserCircle },
  { name: 'Authentic Intent', desc: 'Real motives. Real impact.', icon: Target },
  { name: 'Massive Action', desc: 'You don’t just talk. You build.', icon: Zap },
  { name: 'People Multiplier', desc: 'You lift others up as you rise.', icon: Users },
  { name: 'Empathy Driven', desc: 'You feel first. Then act.', icon: Heart },
  { name: 'Long-Term Vision', desc: 'You play the long game.', icon: Eye },
  { name: 'Creative Problem Solver', desc: 'You see what others miss.', icon: Lightbulb },
  { name: 'Radical Integrity', desc: 'You do the right thing, always.', icon: Shield },
  { name: 'Community First', desc: 'People before profit. Always.', icon: Handshake },
  { name: 'Legacy Builder', desc: 'You’re building what lasts.', icon: History },
];

export function CivilImpactDrivers() {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2 mb-8">
        <h3 className="text-[14px] font-bold uppercase tracking-[3px] text-foreground">THE 10 DRIVERS OF TRUE CIVIL IMPACT</h3>
        <p className="text-[12px] text-muted-foreground italic">It’s not just what you do, it’s who you are while doing it.</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
        {drivers.map((driver, i) => (
          <motion.div
            key={driver.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border">
              <driver.icon size={18} className="text-foreground" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold leading-tight">{driver.name}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{driver.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
