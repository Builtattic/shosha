import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AdminDashboardChartProps {
  data?: { date: string; value: number }[];
  color?: string;
  height?: number;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function buildDefaultData(): { date: string; value: number }[] {
  const values = [45, 62, 58, 71, 66, 74, 78];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return values.map((value, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (values.length - 1 - i));
    return { date: date.toISOString(), value };
  });
}

export default function AdminDashboardChart({
  data,
  color = '#8b5cf6',
  height = 300,
}: AdminDashboardChartProps) {
  const chartData = useMemo(() => data ?? buildDefaultData(), [data]);

  return (
    <div className="relative w-full overflow-hidden rounded-[3rem] border border-white/5 bg-white/[0.02] p-8">
      <div className="absolute left-8 top-8 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
          Protocol Activity Index
        </span>
      </div>
      <div className="mt-10" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="adminChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLabel}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(label) => formatDayLabel(String(label))}
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
              strokeWidth={3}
              fill="url(#adminChartGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
