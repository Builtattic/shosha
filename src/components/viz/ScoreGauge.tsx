'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  min?: number;
  max?: number;
  trending?: 'up' | 'down';
  change?: string;
  className?: string;
}

export function ScoreGauge({
  score,
  min = -1000,
  max = 1000,
  trending = 'up',
  change = '+126',
  className
}: ScoreGaugeProps) {
  const percentage = (score - min) / (max - min);
  const clampedPercentage = Math.max(0, Math.min(1, percentage));

  const radius = 120;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - clampedPercentage * circumference;

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      <div className="relative h-[150px] w-[min(300px,calc(100vw-48px))] sm:h-[160px] sm:w-[300px]">
        <svg
          viewBox={`0 0 ${radius * 2} ${radius + 20}`}
          className="h-full w-full transform overflow-visible"
        >
          <path
            d={`M ${radius - normalizedRadius} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius + normalizedRadius} ${radius}`}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#d4d4d4" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
          </defs>

          <motion.path
            d={`M ${radius - normalizedRadius} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius + normalizedRadius} ${radius}`}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
            }}
          />

          <motion.circle
            r="7"
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="2"
            initial={{ cx: radius - normalizedRadius, cy: radius }}
            animate={{
              cx: radius - Math.cos(clampedPercentage * Math.PI) * normalizedRadius,
              cy: radius - Math.sin(clampedPercentage * Math.PI) * normalizedRadius,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="shadow-sm"
          />

          <text x={radius - normalizedRadius} y={radius + 20} textAnchor="middle" className="fill-muted text-[10px] font-medium">{min}</text>
          <text x={radius + normalizedRadius} y={radius + 20} textAnchor="middle" className="fill-muted text-[10px] font-medium">{max}</text>
          <text x={radius} y={radius - 40} textAnchor="middle" className="fill-muted text-[10px] font-bold uppercase tracking-widest">SHOSHA SCORE</text>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-full truncate px-2 text-[48px] font-bold leading-none text-foreground sm:text-[64px]"
          >
            {score.toLocaleString()}
          </motion.span>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold",
              trending === 'up' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            )}
          >
            {trending === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            Trending {trending}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
