import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Flame, Layers, Loader2, Shuffle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/srs';
import { recordKnowledgeAnswer } from '@/lib/knowledge';
import { clearSession, loadSession, saveSession } from '@/lib/review-session';
import SessionRunner from '@/components/review/SessionRunner';

// 今日の復習の絞り込み。次に開いたときも同じ設定で始められるよう保存する
const FILTER_KEY = 'codemaster-due-filter';
const loadFilter = () => {
  try {
    const v = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    return { wrongOnly: !!v.wrongOnly, skipHeavy: !!v.skipHeavy };
  } catch {
    return { wrongOnly: false, skipHeavy: false };
  }
};
const DUE_FILTERS = [
  { id: 'wrongOnly', label: '間違えた問題だけ', note: '前回まちがえたものだけを出します' },
  { id: 'skipHeavy', label: '重い問題を飛ばす', note: 'コード問題を外して、知識カードだけにします' },
];

const TABS = [
  { id: 'due', label: '今日の復習' },
  { id: 'weak', label: '集中復習' },
  { id: 'mixed', label: '混在セッション' },
  { id: 'upcoming', label: 'この先の予定' },
];

export default function Review() {
  const [items, setItems] = useState(null);
  const [subs, setSubs] = useState([]);
  const [cards, setCards] = useState({});
  const [tab, setTab] = useState(() => (loadSession() ? 'mixed' : 'due'));

  // 問題を解きに行って戻ってきたときは、続きから再開する
  const [session, setSession] = useState(() => loadSession()?.queue || null);
  const [idx, setIdx] = useState(() => loadSession()?.idx || 0);
  const [revealed, setRevealed] = useState(false);
  const [dueFilter, setDueFilter] = useState(loadFilter);


  useEffect(() => {
    if (session) saveSession(session, idx);
  }, [session, idx]);

  useEffect(() => {
    base44.entities.ReviewItem.list({ sort: 'due_date', limit: 200 }).then((page) => setItems(page.items));
    base44.entities.Submission.list({ sort: '-created_date', limit: 200 }).then((page) => setSubs(page.items));
  }, []);

  useEffect(() => {
    const knowledgeIds = (items || []).filter((i) => i.item_type === 'knowledge').map((i) => i.item_id);
    if (knowledgeIds.length === 0) return;
    base44.entities.KnowledgeCard.filter({ id: { $in: knowledgeIds } }, { limit: 100 }).then((page) => {
      const map = {};
      page.items.forEach((c) => {
        map[c.id] = c;
      });
      setCards(map);
    });
  }, [items]);

  const today = todayISO();
  const due = (items || []).filter((i) => i.due_date <= today);
  const upcoming = (items || []).filter((i) => i.due_date > today);
  // 絞り込みを反映した今日の復習
  const matchFilter = (f) => (i) =>
    (!f.wrongOnly || i.last_result === 'wrong') && (!f.skipHeavy || i.item_type === 'knowledge');
  const dueShown = due.filter(matchFilter(dueFilter));
  const filtering = dueFilter.wrongOnly || dueFilter.skipHeavy;

  const buildDueQueue = (f) =>
    due
      .filter(matchFilter(f))
      .filter((i) => i.item_type !== 'knowledge' || cards[i.item_id])
      .map((i) =>
        i.item_type === 'knowledge'
          ? { type: 'knowledge', item: i, card: cards[i.item_id] }
          : { type: 'problem', item: { id: i.item_id, title: i.title || '復習の問題' }, mode: 'review' }
      );

  // セッションの項目を見分けるための鍵（知識カードとコード問題で別にする）
  const keyOf = (entry) => (entry.type === 'knowledge' ? `k:${entry.item?.item_id}` : `p:${entry.item?.id}`);

  const toggleFilter = (id) => {
    const next = { ...dueFilter, [id]: !dueFilter[id] };
    setDueFilter(next);
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても絞り込み自体は使える
    }
    // 復習の途中なら、終えた分はそのままに、残りだけを新しい条件で並べ直す
    if (session) {
      const done = session.slice(0, idx);
      const doneKeys = new Set(done.map(keyOf));
      const rest = buildDueQueue(next).filter((e) => !doneKeys.has(keyOf(e)));
      setSession([...done, ...rest]);
      setRevealed(false);
    }
  };

  const weakProblems = useMemo(() => {
    const acc = {};
    subs.forEach((s) => {
      const e = acc[s.problem_id] || { title: s.problem_title, total: 0, wrong: 0 };
      e.total += 1;
      if (s.verdict !== 'correct') e.wrong += 1;
      acc[s.problem_id] = e;
    });
    return Object.entries(acc)
      .filter(([, v]) => v.wrong > 0)
      .sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total)
      .slice(0, 8)
      .map(([id, v]) => ({ id, ...v, rate: Math.round((v.wrong / v.total) * 100) }));
  }, [subs]);

  const mixableCount =
    due.filter((i) => i.item_type === 'knowledge' && cards[i.item_id]).length + weakProblems.length;

  const startMixed = () => {
    if (mixableCount === 0) return;
    const queue = [
      ...due
        .filter((i) => i.item_type === 'knowledge' && cards[i.item_id])
        .slice(0, 4)
        .map((i) => ({ type: 'knowledge', item: i, card: cards[i.item_id] })),
      ...weakProblems.slice(0, 4).map((p) => ({ type: 'problem', item: p })),
    ].sort(() => Math.random() - 0.5);
    setSession(queue);
    setIdx(0);
    setRevealed(false);
  };

  // 今日の復習を、重いコード問題は飛ばしながら一気に通す
  const startDue = () => {
    if (dueShown.length === 0) return;
    const queue = buildDueQueue(dueFilter);
    if (queue.length === 0) return;
    setSession(queue);
    setIdx(0);
    setRevealed(false);
  };

  const resetSession = () => {
    clearSession();
    setSession(null);
    setIdx(0);
    setRevealed(false);
  };

  const answerKnowledge = (correct) => {
    const current = session[idx];
    recordKnowledgeAnswer(current.card, correct, 'mixed');
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  if (!items) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">REVIEW</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">忘れたころに、もう一度</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          間隔をあけて出し直します。苦手な問題はまとめて集中的に。
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'due' &&
        (session ? (
          <div className="mt-5">
            {due.length > 0 && (
              <FilterChips value={dueFilter} onToggle={toggleFilter} className="mb-3" />
            )}
            <SessionRunner
              session={session}
              idx={idx}
              revealed={revealed}
              onToggle={() => setRevealed((v) => !v)}
              onAnswer={answerKnowledge}
              onSkip={() => {
                setRevealed(false);
                setIdx((i) => i + 1);
              }}
              onReset={resetSession}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {due.length > 0 && (
              <FilterChips value={dueFilter} onToggle={toggleFilter} className="pb-1">
                {filtering && (
                  <span className="text-[10px] text-muted-foreground">
                    {due.length}件中 {dueShown.length}件
                  </span>
                )}
              </FilterChips>
            )}
            <button
              type="button"
              onClick={startDue}
              disabled={dueShown.length === 0}
              className="w-full rounded-lg bg-primary py-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              今日の復習をまとめて始める（{dueShown.length}件）
            </button>
            {due.length === 0 ? (
              <Empty
                icon={CalendarClock}
                text="今日の復習はありません。新しい問題を解くか、集中復習に進みましょう。"
              />
            ) : dueShown.length === 0 ? (
              <Empty icon={CalendarClock} text="この条件に合う今日の復習はありません。絞り込みを外すと、残りの復習が出ます。" />
            ) : (
              <>
                {!dueFilter.skipHeavy && (
                  <p className="px-1 text-[10px] leading-relaxed text-muted-foreground/70">
                    コード問題は重いので、途中の「飛ばす」で先へ進めます。
                  </p>
                )}
                {dueShown.map((i) => <Row key={i.id} item={i} card={cards[i.item_id]} />)}
              </>
            )}
          </div>
        ))}

      {tab === 'weak' && (
        <div className="mt-5 space-y-2">
          {weakProblems.length === 0 ? (
            <Empty icon={Flame} text="まだ誤答の記録がありません。1問解いてみましょう。" />
          ) : (
            weakProblems.map((p) => (
              <Link
                key={p.id}
                to={`/solve/${p.id}?mode=review`}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:border-border hover:bg-accent/30"
              >
                <span className="font-display text-[11px] text-rose-600">{p.rate}%</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{p.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {p.wrong} / {p.total} 回ミス
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'mixed' && (
        <div className="mt-5">
          {!session ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-center">
              <Shuffle className="mx-auto h-5 w-5 text-primary/80" />
              <p className="mt-3 text-xs text-foreground">コードと暗記を交互に</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                復習待ちの知識カードと、誤答の多いコード問題を混ぜて出します。集中が続きます。
              </p>
              <button
                type="button"
                onClick={startMixed}
                disabled={mixableCount === 0}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                セッションを始める
              </button>
              {mixableCount === 0 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  いま混ぜられる項目がありません。1問解くと復習の対象ができます。
                </p>
              )}
            </div>
          ) : (
            <SessionRunner
              session={session}
              idx={idx}
              revealed={revealed}
              onToggle={() => setRevealed((v) => !v)}
              onAnswer={answerKnowledge}
              onSkip={() => {
                setRevealed(false);
                setIdx((i) => i + 1);
              }}
              onReset={resetSession}
            />
          )}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="mt-5 space-y-2">
          {upcoming.length === 0 ? (
            <Empty icon={Layers} text="この先の予定はまだありません。" />
          ) : (
            upcoming.map((i) => <Row key={i.id} item={i} card={cards[i.item_id]} showDate />)
          )}
        </div>
      )}
    </div>
  );
}

function FilterChips({ value, onToggle, className = '', children }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {DUE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onToggle(f.id)}
          aria-pressed={value[f.id]}
          title={f.note}
          className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
            value[f.id]
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
          }`}
        >
          {f.label}
        </button>
      ))}
      {children}
    </div>
  );
}

function Row({ item, card, showDate }) {
  const href =
    item.item_type === 'problem' ? `/solve/${item.item_id}?mode=review` : `/knowledge?card=${item.item_id}`;
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:border-border hover:bg-accent/30"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.item_type === 'problem' ? 'bg-primary' : 'bg-teal-400'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">{item.title || card?.topic || '復習アイテム'}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {item.item_type === 'problem' ? 'コード問題' : '知識カード'}
          {showDate ? ` ・ ${item.due_date}` : item.last_result === 'wrong' ? ' ・ 前回ミス' : ''}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
    </Link>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground/50" />
      <p className="mx-auto mt-3 max-w-sm text-[11px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}