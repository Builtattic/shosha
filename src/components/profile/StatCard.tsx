'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
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
  const gradId = `grad-${label.replace(/\s+/g, '-')}`;
  const pathD = `M ${sparklineData.map((d, i) => `${(i / (sparklineData.length - 1)) * 100},${40 - d * 1.5}`).join(' L ')}`;
  const fillD = `${pathD} L 100 40 L 0 40 Z`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col gap-1 rounded-[16px] border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.1 }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            isUp ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}
        >
          {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </motion.div>
        {change && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className={cn(
              "flex items-center text-[12px] font-bold tabular-nums",
              isUp ? "text-primary" : "text-destructive"
            )}
          >
            {change}
          </motion.div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <motion.h4
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="text-[20px] font-black text-foreground tabular-nums"
        >
          {value}
        </motion.h4>
      </div>

      {/* Mini Sparkline with animated path reveal */}
      <div className="mt-2 h-10 w-full">
         <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={isUp ? "#7eb89a" : "#c97b7b"} stopOpacity="0.25" />
                <stop offset="100%" stopColor={isUp ? "#7eb89a" : "#c97b7b"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={fillD}
              fill={`url(#${gradId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
            <motion.path
              d={pathD}
              fill="none"
              stroke={isUp ? "#7eb89a" : "#c97b7b"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
         </svg>
      </div>
    </motion.div>
  );
}
