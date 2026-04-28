import type { ScoreHistoryPoint } from '@/types';

function normalizePoint(point: ScoreHistoryPoint, index: number, total: number) {
  const x = total <= 1 ? 50 : (index / (total - 1)) * 1000;
  // Normalized score 0-100 to y position 180 to 40
  const y = 180 - Math.max(0, Math.min(100, Number(point.s))) * 1.4;
  return { x, y, cause: point.cause };
}

export function ProfileTrajectory({ points }: { points: ScoreHistoryPoint[] }) {
  const data = points.length
    ? points
    : [
        { t: new Date(), s: 42, cause: 'seed' as const },
        { t: new Date(), s: 58, cause: 'report' as const },
        { t: new Date(), s: 54, cause: 'decay' as const },
        { t: new Date(), s: 74, cause: 'audit' as const },
        { t: new Date(), s: 88, cause: 'report' as const }
      ];
  
  const plotted = data.map((point, index) => normalizePoint(point, index, data.length));
  
  // Create a smooth curve using cubic bezier
  const createPath = (points: {x: number, y: number}[]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 3;
      const cp2x = curr.x + (next.x - curr.x) * 2 / 3;
      d += ` C ${cp1x} ${curr.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = createPath(plotted);
  const areaPath = `${linePath} L 1000 240 L 0 240 Z`;

  return (
    <div className="relative overflow-hidden border-b border-border bg-bg/50">
      <div className="flex items-center justify-between px-8 py-6">
        <p className="font-mono text-[10px] uppercase tracking-[4px] text-muted">Score trajectory</p>
        <div className="flex gap-1">
          {['1W', '1M', '6M', '1Y'].map((range) => (
            <button
              key={range}
              className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] transition-colors ${
                range === '1M' ? 'border-brand-green text-brand-green' : 'border-border text-muted hover:border-muted hover:text-text'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="relative h-64 w-full px-8 pb-8">
        <svg viewBox="0 0 1000 240" className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="traj-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7eb89a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7eb89a" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Horizontal Grid Lines */}
          {[40, 90, 140, 190].map((y) => (
            <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#1e1e1e" strokeWidth="1" />
          ))}
          
          {/* Path and Fill */}
          <path d={areaPath} fill="url(#traj-grad)" />
          <path d={linePath} fill="none" stroke="#7eb89a" strokeWidth="2" />
          
          {/* Data Points */}
          {plotted.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className={point.cause === 'decay' ? 'fill-brand-red' : 'fill-brand-green'}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                className={point.cause === 'decay' ? 'stroke-brand-red/20' : 'stroke-brand-green/20'}
                fill="none"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
