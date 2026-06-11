import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

interface D3ProfileGaugeProps {
  score: number;
  minScore?: number;
  maxScore?: number;
  size?: number;
}

function scoreToFill(normalized: number): string {
  if (normalized >= 55) return '#22c55e';
  if (normalized >= 45) return '#f59e0b';
  return '#ef4444';
}

export function D3ProfileGauge({
  score,
  minScore = -99000,
  maxScore = 101000,
  size = 260,
}: D3ProfileGaugeProps) {
  const clamped = Math.max(minScore, Math.min(maxScore, score));
  const range = maxScore - minScore || 1;
  const normalized = ((clamped - minScore) / range) * 100;
  const data = [{ name: 'score', value: normalized, fill: scoreToFill(normalized) }];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.55 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="85%"
          innerRadius="55%"
          outerRadius="95%"
          startAngle={180}
          endAngle={0}
          data={data}
          barSize={Math.max(10, size * 0.05)}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={8}
            background={{ fill: 'hsl(var(--muted))' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <span
        className="absolute left-2 bottom-0 text-sm font-bold text-muted-foreground"
        aria-hidden
      >
        −
      </span>
      <span
        className="absolute right-2 bottom-0 text-sm font-bold text-muted-foreground"
        aria-hidden
      >
        +
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Shosha Score
        </span>
        <span className="text-2xl font-black tabular-nums text-foreground sm:text-3xl">
          {Math.round(clamped).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default D3ProfileGauge;
