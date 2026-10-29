import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { topicTrends } from '@/lib/growth';

const LINE_COLORS = [
  'hsl(14 55% 46%)',
  'hsl(178 32% 34%)',
  'hsl(38 62% 46%)',
  'hsl(300 20% 44%)',
];

const TOOLTIP = {
  background: '#fffdf7',
  border: '1px solid #e2d7c4',
  borderRadius: 8,
  fontSize: 11,
  color: '#342c24',
};

export default function TopicTrendChart() {
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = [];
      let cursor;
      for (let i = 0; i < 5; i += 1) {
        const page = await base44.entities.Submission.list({ sort: '-created_date', limit: 200, cursor });
        all.push(...page.items);
        if (!page.has_more) break;
        cursor = page.next_cursor;
      }
      if (!cancelled) setSubs(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { topics, data } = useMemo(() => topicTrends(subs || []), [subs]);

  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">苦手の克服ペース（累積の誤答率）</h3>
        <span className="font-display text-[11px] text-muted-foreground">全期間</span>
      </div>

      {subs === null ? (
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-secondary/50" />
      ) : topics.length === 0 ? (
        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          同じトピックを2回以上解くと、誤答率が下がっていく様子がここに出ます。
        </p>
      ) : (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -28 }}>
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
                domain={[0, 100]}
                tick={{ fill: '#8a7c6b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#8a7c6b' }} />
              {topics.map((t, i) => (
                <Line
                  key={t}
                  type="monotone"
                  dataKey={t}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/80">
        縦軸は、その時点までの記録で計算した誤答率です。下がっていれば克服が進んでいます。
      </p>
    </div>
  );
}