'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Dummy data representing stock-style score growth
const generateData = () => {
  let val = 1000;
  const points = [];
  for (let i = 0; i < 50; i++) {
    val += Math.random() * 800 - 200; // General upward trend
    points.push(val);
  }
  points[points.length - 1] = 18420; // End at the exact score from the image
  return points;
};

const defaultData = generateData();

export function ScoreHistory({ className }: { className?: string }) {
  const [activeFilter, setActiveFilter] = useState('1Y');
  const filters = ['1W', '1M', '6M', '1Y'];

  // Normalize data for SVG
  const min = Math.min(...defaultData);
  const max = Math.max(...defaultData);
  const range = max - min;
  
  // Create path strings
  const width = 800;
  const height = 200;
  
  const points = defaultData.map((val, i) => {
    const x = (i / (defaultData.length - 1)) * width;
    const y = height - ((val - min) / range) * height * 0.8 - 20; // 0.8 to leave some padding at top
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-foreground">Score History</h3>
          <span className="text-muted-foreground text-[14px]">ⓘ</span>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1 text-[11px] font-bold rounded-full transition-all",
                activeFilter === filter 
                  ? "bg-foreground text-background shadow-md" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[240px] w-full mt-6">
        {/* Y-Axis Labels (approximated based on image) */}
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-muted-foreground font-medium">
          <span>20K</span>
          <span>15K</span>
          <span>10K</span>
          <span>5K</span>
          <span>0</span>
          <span>-5K</span>
        </div>

        {/* Chart Area */}
        <div className="absolute left-8 right-0 top-0 bottom-8">
          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full border-b border-border/50 h-0" />
            ))}
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <motion.path
              d={areaD}
              fill="url(#chartGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Line */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="#4ade80"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* End Point Dot */}
            <motion.circle
              cx={width}
              cy={height - ((defaultData[defaultData.length - 1] - min) / range) * height * 0.8 - 20}
              r="5"
              fill="#ffffff"
              stroke="#4ade80"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5, type: "spring" }}
            />
          </svg>

          {/* Hover Tooltip Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            className="absolute right-[2%] top-[10%] bg-card border border-border shadow-lg rounded-[12px] p-2 flex flex-col items-center"
          >
            <span className="text-[10px] text-muted-foreground font-medium">May 24, 2024</span>
            <span className="text-[14px] font-bold text-primary">18,420</span>
          </motion.div>
        </div>

        {/* X-Axis Labels */}
        <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[10px] text-muted-foreground font-medium pt-2">
          <span>May &apos;23</span>
          <span>Jul &apos;23</span>
          <span>Sep &apos;23</span>
          <span>Nov &apos;23</span>
          <span>Jan &apos;24</span>
          <span>Mar &apos;24</span>
          <span>May &apos;24</span>
        </div>
      </div>
    </div>
  );
}
