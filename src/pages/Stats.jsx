import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';
import VerdictBadge from '@/components/VerdictBadge';
import WeaknessBar from '@/components/dashboard/WeaknessBar';
import { topicWeakness } from '@/lib/insights';
import { domainLabel } from '@/lib/knowledge-domains';

const DOMAIN_LABELS = {
  business: 'ビジネス',
};

const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};

export default function Stats() {
  const [subs, setSubs] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    base44.entities.Submission.list({ sort: '-created_date', limit: 300 }).then((page) => setSubs(page.items));
    base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 300 }).then((page) => setAttempts(page.items));
  }, []);

  const summary = useMemo(() => {
    const list = subs || [];
    const correct = list.filter((s) => s.verdict === 'correct').length;
    const topicRows = topicWeakness(list, { limit: 50 });

    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[dayKey(d)] = { day: dayKey(d), 提出: 0 };
    }
    list.forEach((s) => {
      const k = dayKey(s.created_date);
      if (days[k]) days[k].提出 += 1;
    });

    const domains = {};
    attempts.forEach((a) => {
      const d = a.domain || 'その他';
      domains[d] = domains[d] || { total: 0, correct: 0 };
      domains[d].total += 1;
      if (a.correct) domains[d].correct += 1;
    });
    const domainRows = Object.entries(domains).map(([domain, v]) => ({
      domain,
      total: v.total,
      rate: Math.round((v.correct / v.total) * 100),
    }));

    return {
      total: list.length,
      correct,
      accuracy: list.length ? Math.round((correct / list.length) * 100) : 0,
      topicRows,
      trend: Object.values(days),
      domainRows,
      recentWrong: list.filter((s) => s.verdict !== 'correct').slice(0, 5),
    };
  }, [subs, attempts]);

  if (!subs) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">INSIGHT</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">弱点を見える形に</h1>
        <p className="mt-2 text-sm text-muted-foreground">採点の記録から自動でまとめています。</p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '提出回数', value: summary.total, unit: '回', to: '/curriculum' },
          { label: '正答率', value: summary.accuracy, unit: '%', to: '/curriculum' },
          { label: '正解', value: summary.correct, unit: '問', to: '/curriculum?filter=solved' },
          { label: '知識カード', value: attempts.length, unit: '回', to: '/knowledge' },
        ].map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-primary/40"
          >
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-xl leading-none">
              {s.value}
              <span className="ml-1 text-[10px] font-body text-muted-foreground">{s.unit}</span>
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary/80" />
            <h2 className="text-sm">直近7日の提出</h2>
          </div>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.trend} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid vertical={false} stroke="hsl(34 24% 85%)" />
                <XAxis dataKey="day" tick={{ fill: '#8a7c6b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#fffdf7',
                    border: '1px solid #e2d7c4',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#342c24',
                  }}
                />
                <Bar dataKey="提出" fill="hsl(14 55% 46%)" radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="text-sm">トピック別の誤答率</h2>
          {summary.topicRows.length === 0 ? (
            <p className="mt-4 text-[11px] text-muted-foreground">まだ記録がありません。</p>
          ) : (
            <div className="mt-4 space-y-3">
              {summary.topicRows.slice(0, 7).map((t) => (
                <WeaknessBar
                  key={t.topic}
                  topic={t.topic}
                  wrong={t.wrong}
                  total={t.total}
                  to={`/generate?topic=${encodeURIComponent(t.topic)}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="text-sm">分野別の知識の定着</h2>
          {summary.domainRows.length === 0 ? (
            <p className="mt-4 text-[11px] text-muted-foreground">知識モードを1回やると記録されます。</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {summary.domainRows.map((d) => (
                <li key={d.domain}>
                  <Link
                    to={`/knowledge?domain=${d.domain}`}
                    className="flex items-center gap-3 rounded-lg transition-colors hover:bg-accent/40"
                  >
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                      {DOMAIN_LABELS[d.domain] || domainLabel(d.domain)}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: `${d.rate}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right font-display text-[11px] text-muted-foreground">
                      {d.rate}% / {d.total}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="text-sm">直近のつまずき</h2>
          {summary.recentWrong.length === 0 ? (
            <p className="mt-4 text-[11px] text-muted-foreground">直近のミスはありません。いい調子です。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.recentWrong.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <VerdictBadge verdict={s.verdict} />
                  <Link
                    to={`/solve/${s.problem_id}?mode=review`}
                    className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {s.problem_title}
                  </Link>
                  <span className="shrink-0 font-display text-[11px] text-muted-foreground/70">{s.score}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}