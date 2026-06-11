import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface D3AreaChartProps {
  data: { date: Date; value: number }[];
  height?: number;
  rangeMode?: 'weekly' | 'monthly' | 'max';
  color?: string;
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function D3AreaChart({
  data,
  height = 200,
  color = '#22c55e',
}: D3AreaChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((point) => ({
          label: formatLabel(point.date),
          date: point.date.toISOString(),
          value: point.value,
        })),
    [data],
  );

  if (chartData.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-border text-[13px] text-muted-foreground"
        style={{ height }}
      >
        Not enough data for chart.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="d3AreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { date?: string } | undefined;
              if (!row?.date) return '';
              return formatLabel(new Date(row.date));
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Score']}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#d3AreaGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default D3AreaChart;
