import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, CircleDot, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DifficultyBadge from '@/components/DifficultyBadge';

const STAGE_META = [
  { stage: 1, title: 'STEP 1 — 定石', desc: '型を体に入れる（配列・文字列・探索）', tone: 'bg-cyan-400' },
  { stage: 2, title: 'STEP 2 — 低レイヤー中級', desc: '中で何が起きているかを意識する（メモリ・ビット）', tone: 'bg-amber-400' },
  { stage: 3, title: 'STEP 3 — 大型テック級', desc: '設計と説明まで問われる水準', tone: 'bg-rose-400' },
];

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'basic', label: '基礎' },
  { id: 'intermediate', label: '中級' },
  { id: 'advanced', label: '上級' },
  { id: 'todo', label: '未着手' },
];

export default function Curriculum() {
  const [problems, setProblems] = useState(null);
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.entities.Problem.filter({ source: 'curriculum' }, { sort: 'order_index', limit: 200 }).then((page) =>
      setProblems(page.items)
    );
    base44.entities.Submission.list({ sort: '-created_date', limit: 200 }).then((page) => setSubs(page.items));
  }, []);

  const statusOf = useMemo(() => {
    const map = {};
    subs.forEach((s) => {
      const prev = map[s.problem_id];
      if (prev === 'correct') return;
      if (s.verdict === 'correct') map[s.problem_id] = 'correct';
      else if (s.verdict === 'partial') map[s.problem_id] = 'partial';
      else map[s.problem_id] = 'wrong';
    });
    return map;
  }, [subs]);

  const visible = (problems || []).filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'todo') return !statusOf[p.id];
    return p.difficulty === filter;
  });

  const solved = (problems || []).filter((p) => statusOf[p.id] === 'correct').length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">CURRICULUM</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">順番に積み上げる</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          定石 → 低レイヤー → 大型テック級。1問ごとに、口で語るのでなく手で書ける形にします。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${problems?.length ? (solved / problems.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {solved} / {problems?.length ?? 0} 問 正解
          </span>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              filter === f.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!problems ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {STAGE_META.map((meta) => {
            const list = visible.filter((p) => (p.stage || 1) === meta.stage);
            if (list.length === 0) return null;
            return (
              <section key={meta.stage}>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.tone}`} />
                  <h2 className="text-sm font-medium">{meta.title}</h2>
                  <span className="text-[11px] text-muted-foreground/70">{meta.desc}</span>
                </div>
                <ul className="mt-3 divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/40">
                  {list.map((p) => {
                    const st = statusOf[p.id];
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/solve/${p.id}?mode=practice`}
                          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                        >
                          <span className="shrink-0">
                            {st === 'correct' ? (
                              <CheckCircle2 className="h-4 w-4 text-teal-400" />
                            ) : st === 'partial' ? (
                              <CircleDot className="h-4 w-4 text-amber-400" />
                            ) : st === 'wrong' ? (
                              <CircleDot className="h-4 w-4 text-rose-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-foreground">{p.title}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {(p.topics || []).join(' ・ ') || 'トピック未設定'}
                            </p>
                          </div>
                          <DifficultyBadge difficulty={p.difficulty} className="shrink-0" />
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}