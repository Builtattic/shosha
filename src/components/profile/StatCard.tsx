'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  sparklineData?: number[];
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend = 'up',
  sparklineData = [10, 15, 8, 12, 18, 14, 20],
  className
}: StatCardProps) {
  const isUp = trend === 'up';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={cn(
        "flex flex-col gap-1 rounded-[16px] border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
         <div className={cn(
           "flex h-8 w-8 items-center justify-center rounded-full",
           isUp ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
         )}>
           {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
         </div>
         {change && (
           <div className={cn(
             "flex items-center text-[12px] font-bold",
             isUp ? "text-primary" : "text-destructive"
           )}>
             {change}
           </div>
         )}
      </div>
      
      <div className="mt-2">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <h4 className="text-[20px] font-bold text-foreground">{value}</h4>
      </div>

      {/* Mini Sparkline */}
      <div className="mt-2 h-10 w-full">
         <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={isUp ? "#7eb89a" : "#c97b7b"} stopOpacity="0.2" />
                <stop offset="100%" stopColor={isUp ? "#7eb89a" : "#c97b7b"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${sparklineData.map((d, i) => `${(i / (sparklineData.length - 1)) * 100},${40 - d * 1.5}`).join(' L ')} L 100 40 L 0 40 Z`}
              fill={`url(#grad-${label})`}
            />
            <path
              d={`M ${sparklineData.map((d, i) => `${(i / (sparklineData.length - 1)) * 100},${40 - d * 1.5}`).join(' L ')}`}
              fill="none"
              stroke={isUp ? "#7eb89a" : "#c97b7b"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
         </svg>
      </div>
    </motion.div>
  );
}
