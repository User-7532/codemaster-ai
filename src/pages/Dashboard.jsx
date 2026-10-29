import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Target, RotateCcw, Code2, ArrowRight, Sparkles, Timer, BookOpen, Palette, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { todayISO, toISO } from '@/lib/srs';
import { topicWeakness } from '@/lib/insights';
import StatCard from '@/components/dashboard/StatCard';
import StageCard from '@/components/dashboard/StageCard';
import WeaknessBar from '@/components/dashboard/WeaknessBar';
import GrowthChart from '@/components/dashboard/GrowthChart';
import TopicTrendChart from '@/components/dashboard/TopicTrendChart';

const DIFF_META = [
  { key: 'basic', label: '基礎', title: '型を体に入れる', subtitle: '二本ポインタ、BFS、再帰など王道の型', tone: 'cyan' },
  { key: 'intermediate', label: '中級', title: '中で起きていること', subtitle: 'メモリ・ポインタ・計算量の感覚を問う問題', tone: 'amber' },
  { key: 'advanced', label: '上級', title: '大型テック級', subtitle: '時間内に設計まで語る面接水準の問題', tone: 'rose' },
];

const QUICK = [
  { to: '/curriculum', label: '問題を1問解く', icon: Code2 },
  { to: '/review', label: '復習する', icon: RotateCcw },
  { to: '/generate', label: 'AIに問題を作ってもらう', icon: Sparkles },
  { to: '/interview', label: '模擬面接（時間制限つき）', icon: Timer },
  { to: '/knowledge', label: '穴埋めで暗記', icon: BookOpen },
  { to: '/stats', label: '弱点分析を見る', icon: BarChart3 },
];

function streakOf(submissions) {
  const days = new Set(submissions.map((s) => toISO(new Date(s.created_date))));
  const cursor = new Date();
  if (!days.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(toISO(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function Dashboard() {
  const [subs, setSubs] = useState(null);
  const [problems, setProblems] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    base44.entities.Submission.list({ sort: '-created_date', limit: 300 }).then((page) => setSubs(page.items));
    base44.entities.Problem.filter({ source: 'curriculum' }, { sort: 'order_index', limit: 200 }).then((page) =>
      setProblems(page.items)
    );
    base44.entities.ReviewItem.list({ sort: 'due_date', limit: 200 }).then((page) => setReviews(page.items));
  }, []);

  const data = useMemo(() => {
    const list = subs || [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = list.filter((s) => new Date(s.created_date).getTime() >= weekAgo);
    const weeklyAccuracy = weekly.length
      ? Math.round((weekly.filter((s) => s.verdict === 'correct').length / weekly.length) * 100)
      : 0;

    const solvedIds = new Set(list.filter((s) => s.verdict === 'correct').map((s) => s.problem_id));
    const attemptedIds = new Set(list.map((s) => s.problem_id));

    const today = todayISO();
    const due = reviews.filter((r) => r.due_date <= today);

    return {
      streak: streakOf(list),
      weeklyAccuracy,
      weeklyCount: weekly.length,
      solvedIds,
      attemptedIds,
      due,
      weak: topicWeakness(list, { limit: 4 }),
    };
  }, [subs, reviews]);

  const diffStats = DIFF_META.map((meta) => {
    const list = problems.filter((p) => p.difficulty === meta.key);
    return {
      ...meta,
      total: list.length,
      solved: list.filter((p) => data.solvedIds.has(p.id)).length,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
      <header className="rise-in flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            今日は、どこまで<span className="text-primary">書ける</span>ようにする？
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            型を覚えるより、手を動かして自分でひねり出す。面接で聞かれる順番どおりに、少しずつ積み上げます。
          </p>
        </div>
        <Link
          to="/appearance"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
        >
          <Palette className="h-3.5 w-3.5" /> 見た目
        </Link>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="連続学習"
          value={data.streak}
          unit="日"
          hint={data.streak === 0 ? '今日から始めよう' : data.streak >= 3 ? 'いい流れです' : 'あと少しで習慣に'}
          tone="primary"
          to="/stats"
        />
        <StatCard
          icon={Target}
          label="今週の正答率"
          value={data.weeklyAccuracy}
          unit="%"
          hint={`今週 ${data.weeklyCount} 回提出`}
          tone="mint"
          to="/stats"
        />
        <StatCard
          icon={RotateCcw}
          label="復習待ち"
          value={data.due.length}
          unit="問"
          hint={data.due.length ? '今日のうちに' : '復習は片付いています'}
          tone="amber"
          to="/review"
        />
        <StatCard
          icon={Code2}
          label="解いた問題"
          value={data.attemptedIds.size}
          unit="問"
          hint={`正解 ${data.solvedIds.size} 問`}
          tone="violet"
          to="/curriculum?filter=solved"
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">今日のロードマップ</h2>
            <Link to="/curriculum" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              問題一覧 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {diffStats.map((s) => (
              <StageCard key={s.key} {...s} to={`/curriculum?filter=${s.key}`} />
            ))}
          </div>

          <div className="mt-7 rounded-xl border border-border/70 bg-card/50 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">苦手なところ（誤答率）</h2>
              <Link to="/stats" className="text-[11px] text-muted-foreground hover:text-foreground">
                くわしく見る
              </Link>
            </div>
            {data.weak.length === 0 ? (
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/80">
                まだ記録がありません。1問解くと、ここに苦手なトピックが並びます。
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.weak.map((w) => (
                  <WeaknessBar key={w.topic} {...w} to={`/generate?topic=${encodeURIComponent(w.topic)}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-card/50 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">今日の復習</h2>
              <span className="font-display text-[11px] text-muted-foreground">{data.due.length}件</span>
            </div>
            {data.due.length === 0 ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
                今日の復習はありません。新しい問題に進みましょう。
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {data.due.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link
                      to={r.item_type === 'problem' ? `/solve/${r.item_id}?mode=review` : '/knowledge'}
                      className="flex items-start gap-2.5 py-2.5 transition-colors hover:text-primary"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-foreground">{r.title || '復習アイテム'}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {r.item_type === 'problem' ? 'コード問題' : '知識カード'}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-primary">
                        {r.due_date === todayISO() ? '今日' : r.due_date}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/review"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border/80 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              復習をはじめる <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-5">
            <h2 className="text-sm font-medium">すぐ始める</h2>
            <div className="mt-3 space-y-1">
              {QUICK.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary/80" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">これまでの成長</h2>
          <Link to="/stats" className="text-[11px] text-muted-foreground hover:text-foreground">
            くわしく見る
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <GrowthChart />
          <TopicTrendChart />
        </div>
      </section>
    </div>
  );
}