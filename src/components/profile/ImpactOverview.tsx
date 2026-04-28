'use client';

import { motion } from 'framer-motion';
import { Users, Utensils, Home, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImpactStat {
  label: string;
  value: string;
  change: string;
  icon: any;
  color: string;
}

const impactStats: ImpactStat[] = [
  { label: 'People Helped', value: '23.4M', change: '+2.1M this month', icon: Users, color: 'text-primary' },
  { label: 'Meals Provided', value: '12.7M', change: '+1.3M this month', icon: Utensils, color: 'text-blue-400' },
  { label: 'Homes Built', value: '3,512', change: '+412 this month', icon: Home, color: 'text-purple-400' },
  { label: 'Wells Built', value: '856', change: '+98 this month', icon: Droplets, color: 'text-orange-400' },
];

const categories = [
  { label: 'Poverty & Hunger', value: '45.6M', percentage: 35, color: '#7eb89a' },
  { label: 'Housing', value: '28.3M', percentage: 22, color: '#60a5fa' },
  { label: 'Education', value: '22.1M', percentage: 17, color: '#a78bfa' },
  { label: 'Clean Water', value: '18.7M', percentage: 14, color: '#fb923c' },
  { label: 'Disaster Relief', value: '14.0M', percentage: 11, color: '#f87171' },
];

export function ImpactOverview() {
  return (
    <div className="space-y-8 py-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[18px] font-bold">Impact Overview</h3>
          <span className="text-muted-foreground">ⓘ</span>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">The real world impact created through actions</p>
        
        <div className="grid grid-cols-2 gap-3">
          {impactStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-[20px] border border-border bg-card p-4"
            >
              <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50", stat.color)}>
                <stat.icon size={18} />
              </div>
              <h4 className="text-[18px] font-bold">{stat.value}</h4>
              <p className="text-[11px] text-muted-foreground mb-1">{stat.label}</p>
              <p className={cn("text-[10px] font-bold", stat.color)}>↗ {stat.change}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[18px] font-bold">Impact Categories</h3>
          <span className="text-muted-foreground">ⓘ</span>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 rounded-[24px] border border-border bg-card p-6">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
              {categories.reduce((acc, cat, i) => {
                const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                const strokeDashoffset = -acc;
                acc += cat.percentage;
                return [
                  ...acc as any,
                  <circle
                    key={cat.label}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth="12"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000"
                  />
                ];
              }, [] as any)}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-bold">128.7M</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Impact</span>
            </div>
          </div>

          <div className="flex-1 space-y-3 w-full">
            {categories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-[13px] font-medium text-muted-foreground">{cat.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-bold">{cat.value}</span>
                  <span className="text-[13px] text-muted-foreground w-8 text-right">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
