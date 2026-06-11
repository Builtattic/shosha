import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

interface D3ScoreGaugeProps {
  score: number;
  size?: number;
}

function scoreToColor(s: number): string {
  if (s >= 70) return '#22c55e';
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

export function D3ScoreGauge({ score, size = 180 }: D3ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const data = [{ name: 'score', value: clamped, fill: scoreToColor(clamped) }];

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="80%"
          innerRadius="60%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={data}
          barSize={12}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: 'hsl(var(--muted))' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default D3ScoreGauge;
