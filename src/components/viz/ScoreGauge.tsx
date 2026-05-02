'use client';

import { motion, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  min?: number;
  max?: number;
  trending?: 'up' | 'down';
  change?: string;
  credibility?: number;
  className?: string;
}

export function ScoreGauge({
  score,
  min = 0,
  max = 2000,
  trending = 'up',
  change = '+0',
  credibility = 80,
  className
}: ScoreGaugeProps) {
  const [mounted, setMounted] = useState(false);
  const [angle, setAngle] = useState(0);

  const percentage = (score - min) / (max - min);
  const clampedPercentage = Math.max(0, Math.min(1, percentage));

  useEffect(() => {
    setMounted(true);
    const targetAngle = clampedPercentage * Math.PI;
    const controls = animate(0, targetAngle, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setAngle(v)
    });
    return controls.stop;
  }, [clampedPercentage]);

  const radius = 140;
  const strokeWidth = 16;
  const normalizedRadius = radius - strokeWidth / 2;

  const pointerX = radius - Math.cos(angle) * normalizedRadius;
  const pointerY = radius - Math.sin(angle) * normalizedRadius;

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      {/* Top Details */}
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          SHOSHA SCORE
        </h2>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[64px] font-bold leading-none text-foreground mb-4"
        >
          {score.toLocaleString()}
        </motion.div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-[13px] font-medium text-foreground">
            {change.startsWith('-') || change === '0' ? (
              <Minus size={14} />
            ) : trending === 'up' ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {change} this week
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-[13px] font-medium text-foreground">
            Credibility {credibility}%
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground mb-4">
          Base 1,000 - ledger never resets
        </p>

        <button className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted active:scale-95">
          <RefreshCw size={14} />
          Recalculate from history
        </button>
      </div>

      {/* SVG Arc Graph */}
      <div className="relative h-[150px] w-[min(320px,calc(100vw-48px))] sm:h-[160px] sm:w-[340px]">
        <svg
          viewBox={`0 0 ${radius * 2} ${radius + strokeWidth}`}
          className="h-full w-full transform overflow-visible"
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />   {/* Red */}
              <stop offset="50%" stopColor="#f59e0b" />  {/* Amber/Yellow */}
              <stop offset="100%" stopColor="#22c55e" /> {/* Green */}
            </linearGradient>
          </defs>

          {/* Background Track Arc - Fully colored with gradient statically */}
          <path
            d={`M ${radius - normalizedRadius} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius + normalizedRadius} ${radius}`}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Pointer/Thumb */}
          {mounted && (
            <circle
              r="12"
              cx={pointerX}
              cy={pointerY}
              className="fill-background stroke-foreground"
              strokeWidth="2.5"
            />
          )}

          {/* Min / Max Labels */}
          <text x={radius - normalizedRadius} y={radius + 30} textAnchor="middle" className="fill-muted-foreground text-[12px] font-medium">{min}</text>
          <text x={radius + normalizedRadius} y={radius + 30} textAnchor="middle" className="fill-muted-foreground text-[12px] font-medium">{max}</text>
        </svg>
      </div>
    </div>
  );
}
