import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { dailySeries } from '@/lib/growth';

const TOOLTIP = {
  background: '#fffdf7',
  border: '1px solid #e2d7c4',
  borderRadius: 8,
  fontSize: 11,
  color: '#342c24',
};

export default function GrowthChart() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    base44.entities.Submission.aggregate({
      groupBy: 'verdict',
      dateBucket: { field: 'created_date', unit: 'day' },
    })
      .then((res) => setRows(res.rows || []))
      .catch(() => setRows([]));
  }, []);

  const data = useMemo(() => dailySeries(rows || []), [rows]);

  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-xs font-medium">学習量と正答率</h3>
        <span className="shrink-0 font-display text-[10px] text-muted-foreground">全期間</span>
      </div>

      {rows === null ? (
        <div className="mt-3 h-32 animate-pulse rounded-lg bg-secondary/50" />
      ) : data.length === 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          まだ記録がありません。1問解くと、ここに積み上がり方が出ます。
        </p>
      ) : (
        <div className="mt-3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: -18, bottom: 0, left: -28 }}>
              <CartesianGrid vertical={false} stroke="hsl(34 24% 85%)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8a7c6b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#8a7c6b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: '#8a7c6b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#8a7c6b' }} />
              <Bar yAxisId="left" dataKey="提出" fill="hsl(14 55% 46%)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="正答率"
                stroke="hsl(178 32% 38%)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}