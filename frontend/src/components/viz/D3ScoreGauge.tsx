import { cn } from '@/lib/utils';

interface D3ScoreGaugeProps {
  score: number;   // 0..100
  size?: number;   // px, default 180
}

// Stub — SVG-based gauge (no D3 dep). Full D3ScoreGauge.tsx from V1 to be ported.
export function D3ScoreGauge({ score, size = 180 }: D3ScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (clamped / 100);

  const colorClass =
    clamped >= 80 ? 'text-emerald-500'
    : clamped >= 60 ? 'text-yellow-500'
    : clamped >= 40 ? 'text-orange-500'
    : 'text-red-500';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full -rotate-90"
        aria-label={`Score: ${clamped}`}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="currentColor"
          strokeWidth={size * 0.065}
          fill="none"
          className="text-muted/30"
        />
        {/* Fill */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="currentColor"
          strokeWidth={size * 0.065}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={cn('transition-all duration-700', colorClass)}
        />
      </svg>
    </div>
  );
}
