import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Github,
  ChevronDown,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MessageCircleQuestion,
  PenLine,
  RotateCcw,
  Sparkles,
  Timer,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import TraceEditor, { compareLines, sameCode } from '@/components/trace/TraceEditor';
import { LANGUAGES, languageLabel } from '@/lib/languages';
import { MAX_IMAGES, imagesFromClipboard, signedUrls, useImageAttachments } from '@/lib/attachments';
import { ImageStrip } from '@/components/assistant/ImageStrip';
import { askAboutSelection } from '@/lib/selection-ask';
import { addDaysISO, todayISO } from '@/lib/srs';
import { cn } from '@/lib/utils';

// 段階：なぞり書き → 見ながら書く → 隠して書く。手助けを少しずつ減らす
const MODES = [
  { id: 'ghost', label: 'なぞり書き', icon: PenLine, desc: 'お手本が薄く下に出る。その上をなぞる' },
  { id: 'side', label: '見ながら', icon: Eye, desc: 'お手本は上に。下の白紙に写す' },
  { id: 'hidden', label: '隠して', icon: EyeOff, desc: 'お手本なしで書く。詰まったら少しだけ見る' },
];

const SUGGEST = {
  python: ['for文とリストの基本', '辞書で数を数える', '関数の引数と戻り値', '文字列を分割して処理する', 'クラスの基本の形'],
  c: ['配列とfor文', 'ポインタと配列の関係', 'mallocとfreeの型', '構造体を使う', '文字列（char配列）の操作'],
  cpp: ['vectorとループ', 'mapで数を数える', 'sortと比較関数', 'クラスとコンストラクタ', '再帰関数の型'],
};

const KEY_DRAFT = (id) => `codemaster.trace.${id}`;

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/* ---------------- お手本のパネル（選んでAIに聞ける。行を押すと解説） ---------------- */
function ModelPanel({ drill, className }) {
  const [open, setOpen] = useState(null);
  const notes = useMemo(() => new Map((drill.line_notes || []).map((n) => [n.line, n.note])), [drill]);
  const lines = drill.code.split('\n');

  return (
    <div className={cn('overflow-auto rounded-xl border border-border/70 bg-card/80', className)}>
      <div className="font-mono text-[12.5px] leading-6">
        {lines.map((line, i) => {
          const n = i + 1;
          const note = notes.get(n);
          return (
            <div key={i}>
              <div
                onClick={() => note && setOpen(open === n ? null : n)}
                className={cn('flex whitespace-pre', note && 'cursor-pointer hover:bg-primary/5', open === n && 'bg-primary/10')}
              >
                <span className="w-9 shrink-0 select-none pr-2 text-right text-muted-foreground/60">{n}</span>
                <span className={cn('mr-1.5 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full', note ? 'bg-primary/70' : 'bg-transparent')} />
                <span className="pr-4 text-foreground">{line || ' '}</span>
              </div>
              {open === n && (
                <div className="mx-3 mb-2 rounded-lg bg-primary/5 px-3 py-2 font-sans text-[12px] leading-relaxed text-foreground/90">
                  {note}
                  <button
                    type="button"
                    onClick={() => askAboutSelection(`${line.trim()}\n（解説：${note}）`)}
                    className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <MessageCircleQuestion className="h-3 w-3" /> この行についてAIに聞く
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 隠して書くときの問題文 ---------------- */
// `名前` はコードどおりに書く必要がある語句。目立たせて表示する
function SpecText({ text }) {
  return String(text)
    .split(/(`[^`]+`)/)
    .map((part, i) =>
      part.startsWith('`') && part.endsWith('`') ? (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[11.5px] text-foreground">
          {part.slice(1, -1)}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

const SPEC_VIEW_KEY = 'codemaster-trace-spec-view-v2';
const readSpecView = () => {
  try {
    // 何も選んでいなければ「問題文だけ」
    return localStorage.getItem(SPEC_VIEW_KEY) === 'steps' ? 'steps' : 'brief';
  } catch {
    return 'brief';
  }
};

function SpecPanel({ spec, loading, currentLine }) {
  // 手順つき（ヒント多め）と、問題文だけ（何を作るかと、合わせる名前だけ）を切り替える
  const [view, setView] = useState(readSpecView);
  const choose = (v) => {
    setView(v);
    try {
      localStorage.setItem(SPEC_VIEW_KEY, v);
    } catch {
      // 切り替え自体は使える
    }
  };

  if (loading && !(spec?.steps?.length && spec?.brief)) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-4 py-3 text-[12px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> 問題文を用意しています…
      </div>
    );
  }
  if (!spec?.steps?.length) return null;
  // 今書いている行が入っている手順。行が空いているところなら、その次の手順
  const found = spec.steps.findIndex((st) => currentLine <= st.to);
  const current = found === -1 ? spec.steps.length - 1 : found;
  const showBrief = view === 'brief' && spec.brief;

  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium">{showBrief ? '問題' : spec.overview}</p>
        <div className="flex shrink-0 rounded-full border border-border/70 p-0.5 text-[10.5px]">
          {[
            ['brief', '問題文だけ'],
            ['steps', '手順つき'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              className={cn(
                'rounded-full px-2.5 py-0.5 transition-colors',
                view === id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {showBrief ? (
        <p className="mt-2 text-[12.5px] leading-relaxed">
          <SpecText text={spec.brief} />
        </p>
      ) : (
        <ol className="mt-2 space-y-1">
          {spec.steps.map((st, i) => (
            <li
              key={i}
              className={cn(
                'flex gap-2 rounded-lg px-2 py-1 text-[12px] leading-relaxed transition-colors',
                i === current ? 'bg-primary/10 text-foreground' : i < current ? 'text-muted-foreground/60' : 'text-muted-foreground'
              )}
            >
              <span className={cn('mt-[1px] w-4 shrink-0 text-right font-mono text-[11px]', i === current && 'text-primary')}>
                {i < current ? '✓' : i + 1}
              </span>
              <span>
                <SpecText text={st.text} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------------- 写経している画面 ---------------- */
function TraceSession({ drill, onUpdate, onStartNext }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const recommended = MODES[Math.min(drill.level || 0, 2)].id;
  const [mode, setMode] = useState(recommended);
  const [value, setValue] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [mistakes, setMistakes] = useState(0);
  const [peeks, setPeeks] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [done, setDone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [gisting, setGisting] = useState(false);
  const [nextSteps, setNextSteps] = useState(drill.next_steps || []);
  const [nextLoading, setNextLoading] = useState(false);
  const [startingNext, setStartingNext] = useState(null);
  const [spec, setSpec] = useState(drill.spec || null);
  const [specLoading, setSpecLoading] = useState(false);
  const lastBad = useRef(0);
  const editorRef = useRef(null);

  // 書きかけは端末に残し、続きから書ける
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY_DRAFT(drill.id)) || 'null');
      if (saved?.value) {
        setValue(saved.value);
        if (saved.mode) setMode(saved.mode);
      }
    } catch {
      // 書きかけがなければ白紙から
    }
  }, [drill.id]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_DRAFT(drill.id), JSON.stringify({ value, mode }));
    } catch {
      // 保存できなくても書ける
    }
  }, [value, mode, drill.id]);

  useEffect(() => {
    if (!startedAt || done) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, done]);

  const stats = compareLines(drill.code, value, editorRef.current?.selectionStart);
  const seconds = startedAt ? Math.round(((done?.at || now) - startedAt) / 1000) : 0;

  const change = (next, caret) => {
    if (done) return;
    if (!startedAt) setStartedAt(Date.now());
    const s = compareLines(drill.code, next, caret);
    // 間違いの数は、赤い字が増えた分だけ数える（直しても減らない）
    if (s.bad > lastBad.current) setMistakes((m) => m + (s.bad - lastBad.current));
    lastBad.current = s.bad;
    setValue(next);
    if (sameCode(next, drill.code)) complete(next);
  };

  const switchMode = (id) => {
    setMode(id);
    setShowModel(id === 'side');
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const reset = () => {
    setValue('');
    setStartedAt(null);
    setMistakes(0);
    setPeeks(0);
    setDone(null);
    lastBad.current = 0;
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const peek = () => {
    setPeeks((p) => p + 1);
    setPeeking(true);
    setTimeout(() => setPeeking(false), 3000);
  };

  // 写し終えたら記録し、はじめての完了なら練習問題を作って復習にも入れる
  const complete = async () => {
    const at = Date.now();
    const secs = startedAt ? Math.round((at - startedAt) / 1000) : 0;
    setDone({ at, seconds: secs });
    setSaving(true);
    try {
      const modeIndex = MODES.findIndex((m) => m.id === mode);
      const patch = {
        completions: (drill.completions || 0) + 1,
        level: Math.max(drill.level || 0, Math.min(2, modeIndex + 1)),
        last_done: todayISO(),
        history: [...(drill.history || []), { mode, seconds: secs, mistakes, peeks, date: todayISO() }].slice(-30),
        ...(mode === 'hidden' && (drill.best_seconds == null || secs < drill.best_seconds) ? { best_seconds: secs } : {}),
        ...(mode === 'hidden' && (drill.best_mistakes == null || mistakes < drill.best_mistakes) ? { best_mistakes: mistakes } : {}),
      };
      let problemId = drill.problem_id;
      const f = drill.follow_up;
      if (!problemId && f?.title && f?.statement) {
        const problem = await base44.entities.Problem.create({
          title: String(f.title).slice(0, 80),
          statement: f.statement,
          constraints: f.constraints || '',
          difficulty: 'basic',
          stage: 1,
          topics: [...(f.topics || []), '写経'].slice(0, 4),
          templates: f.template ? [{ language: drill.language, code: f.template }] : [],
          hints: (f.hints || []).slice(0, 3),
          test_cases: (f.test_cases || []).slice(0, 4),
          time_limit_minutes: 15,
          source: 'trace',
          trace_id: drill.id,
          order_index: 950,
        });
        problemId = problem.id;
        patch.problem_id = problemId;
        await base44.entities.ReviewItem.create({
          item_type: 'problem',
          item_id: problemId,
          title: problem.title,
          topic: (f.topics || [])[0] || '写経',
          due_date: addDaysISO(1),
          interval_days: 1,
          streak: 0,
        });
        toast({ title: '練習問題に追加しました', description: '明日の復習にも入れてあります。' });
      }
      const updated = await base44.entities.TraceDrill.update(drill.id, patch);
      onUpdate({ ...drill, ...patch, ...(updated || {}) });
      loadNextSteps();
      try {
        localStorage.removeItem(KEY_DRAFT(drill.id));
      } catch {
        // 消せなくても次はやり直しから
      }
    } catch {
      toast({ title: '記録できませんでした', description: '通信を確かめて、もう一度写し終えてください。', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 写したコードを GitHub に保存する（練習問題の画面と同じ、本人だけが見られる Gist）
  const sendToGist = async () => {
    setGisting(true);
    try {
      const code = value.trim() ? value : drill.code;
      const res = await base44.functions.invoke('exportGist', { title: `${drill.title}（写経）`, code, language: drill.language });
      if (res.data?.error) throw new Error(res.data.error);
      if (!res.data?.connected) {
        toast({ title: 'まだ保存できません', description: 'GitHubの準備ができていません。少し待ってからもう一度お試しください' });
        return;
      }
      window.open(res.data.url, '_blank');
      toast({ title: 'GitHubに保存しました', description: '写したコードはいつでも見返せます' });
    } catch (e) {
      toast({ title: 'GitHubに送れませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setGisting(false);
    }
  };

  // 写し終えたら、次に写経するとよいものを小さく提案する（今回の書きぶりで難しさを決める）
  const loadNextSteps = async () => {
    setNextLoading(true);
    try {
      const res = await base44.functions.invoke('suggestNextTrace', { drill_id: drill.id });
      if (Array.isArray(res.data?.next_steps)) setNextSteps(res.data.next_steps);
    } catch {
      // 提案がなくても写経は続けられる
    } finally {
      setNextLoading(false);
    }
  };

  // 写経の問題文（なにを作るか）。どのモードでも最初から出す
  useEffect(() => {
    // 問題文はどのモードでも上に出す（何を作っているかを見失わないように）
    if ((spec?.steps?.length && spec?.brief) || specLoading) return;
    let cancelled = false;
    setSpecLoading(true);
    base44.functions
      .invoke('traceSpec', { drill_id: drill.id })
      .then((res) => !cancelled && res.data?.spec && setSpec(res.data.spec))
      .catch(() => {})
      .finally(() => !cancelled && setSpecLoading(false));
    return () => {
      cancelled = true;
    };
  }, [drill.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentLine = value.split('\n').length;
  const modelVisible = mode === 'side' || showModel || peeking;
  const nextMode = MODES[Math.min(MODES.findIndex((m) => m.id === mode) + 1, 2)];

  return (
    <div className="space-y-4">
      {/* 段階の切り替え */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => switchMode(m.id)}
            title={m.desc}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors',
              mode === m.id ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-border/70 text-muted-foreground hover:text-foreground'
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
            {m.id === recommended && <span className="text-[10px] text-primary">おすすめ</span>}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" /> {fmt(seconds)}
          </span>
          <span>ミス {mistakes}</span>
          {mode === 'hidden' && <span>のぞき {peeks}</span>}
          <button
            type="button"
            onClick={sendToGist}
            disabled={gisting}
            className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-sans text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
            title="写したコードをGitHubに保存する（まだ何も書いていなければお手本を保存）"
          >
            {gisting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
            {gisting ? '保存中…' : 'コードを保存'}
          </button>
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${Math.round(stats.progress * 100)}%` }} />
      </div>

      <SpecPanel spec={spec} loading={specLoading} currentLine={currentLine} />

      {/* お手本：見ながらモードと、のぞいている間は上に出す。ほかのモードでも開ける */}
      {modelVisible && <ModelPanel drill={drill} className="max-h-[34vh] py-2" />}

      <TraceEditor
        ref={editorRef}
        model={drill.code}
        value={value}
        onChange={change}
        mode={mode}
        language={drill.language}
        onFirstKey={() => !startedAt && setStartedAt(Date.now())}
      />

      <div className="flex flex-wrap items-center gap-2">
        {mode === 'hidden' ? (
          <button
            type="button"
            onClick={peek}
            disabled={peeking}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" /> ちょっと見る（3秒）
          </button>
        ) : (
          mode !== 'side' && (
            <button
              type="button"
              onClick={() => setShowModel((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showModel && 'rotate-180')} />
              お手本と行ごとの解説
            </button>
          )
        )}
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 最初から
        </button>
        <p className="ml-auto text-[10.5px] text-muted-foreground/80">
          分からないところは、お手本を選ぶとAIに聞けます
        </p>
      </div>

      {/* 写し終えたあと */}
      {done && (
        <div className="rise-in rounded-2xl border border-primary/30 bg-card/90 p-5">
          <p className="flex items-center gap-1.5 font-display text-lg">
            <Check className="h-5 w-5 text-primary" /> 写し終えました
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {MODES.find((m) => m.id === mode)?.label}・{fmt(done.seconds)}・ミス {mistakes}
            {mode === 'hidden' ? `・のぞき ${peeks}` : ''}
          </p>
          {(drill.key_points || []).length > 0 && (
            <ul className="mt-3 space-y-1 text-[12.5px] leading-relaxed">
              {drill.key_points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {mode !== 'hidden' && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  switchMode(nextMode.id);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3.5 py-2 text-[12px] hover:border-primary/40"
              >
                次は「{nextMode.label}」で書く
              </button>
            )}
            {mode === 'hidden' && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3.5 py-2 text-[12px] hover:border-primary/40"
              >
                もう一度、隠して書く
              </button>
            )}
            {(drill.problem_id || saving) && (
              <button
                type="button"
                disabled={saving || !drill.problem_id}
                onClick={() => navigate(`/solve/${drill.problem_id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                型を使って練習問題を解く
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="text-[12px] font-medium">次の写経</p>
            {nextLoading && nextSteps.length === 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 今回の書きぶりに合わせて選んでいます…
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {nextSteps.map((n) => (
                  <button
                    key={n.title}
                    type="button"
                    disabled={!!startingNext}
                    onClick={async () => {
                      setStartingNext(n.title);
                      try {
                        await onStartNext?.(n.goal, drill);
                      } finally {
                        setStartingNext(null);
                      }
                    }}
                    className="rounded-xl border border-border/70 bg-background/60 p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
                  >
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{n.step}</span>
                    <span className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium">
                      {startingNext === n.title && <Loader2 className="h-3 w-3 animate-spin" />}
                      {n.title}
                    </span>
                    {n.why && <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{n.why}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 写経の場（作る・選ぶ） ---------------- */
export default function Trace() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('id');
  const { toast } = useToast();
  const [drills, setDrills] = useState(null);
  const [goal, setGoal] = useState('');
  const [language, setLanguage] = useState('python');
  const [size, setSize] = useState('short');
  const [busy, setBusy] = useState(false);
  const att = useImageAttachments();
  const fileRef = useRef(null);

  useEffect(() => {
    base44.entities.TraceDrill.list({ sort: '-created_date', limit: 100 })
      .then((page) => setDrills(page.items || []))
      .catch(() => setDrills([]));
  }, []);

  const active = (drills || []).find((d) => d.id === activeId) || null;
  // 一番最近写し終えた写経（次のおすすめを出すため）
  const latestDone = (drills || [])
    .filter((d) => d.last_done && (d.next_steps || []).length)
    .sort((a, b) => String(b.last_done).localeCompare(String(a.last_done)) || String(b.updated_date).localeCompare(String(a.updated_date)))[0];

  const create = async (text = goal, opts = {}) => {
    const g = String(text).trim();
    // 画像を添えられるのは入力欄から作るときだけ（おすすめから作るときは使わない）
    const withImages = !opts.from && !opts.noImages ? att.ready.map((x) => x.uri) : [];
    if ((!g && !withImages.length) || busy || att.uploading) return;
    const lang = opts.language || language;
    setBusy(true);
    try {
      const imageUrls = withImages.length ? await signedUrls(withImages) : [];
      const res = await base44.functions.invoke('generateTrace', {
        goal: g,
        image_urls: imageUrls,
        language: lang,
        size: opts.size || size,
        done_titles: (drills || []).filter((d) => d.language === lang).map((d) => d.title),
      });
      if (res.data?.error) throw new Error(res.data.error);
      let drill = res.data.drill;
      if (opts.from) {
        drill = { ...drill, from_drill_id: opts.from };
        base44.entities.TraceDrill.update(drill.id, { from_drill_id: opts.from }).catch(() => {});
      }
      setDrills((prev) => [drill, ...(prev || [])]);
      setGoal('');
      if (withImages.length) att.clear();
      setParams({ id: drill.id });
    } catch (e) {
      toast({ title: '写経の場を作れませんでした', description: e.message || 'もう一度お試しください。', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-2 sm:px-8">
        <Link to="/trace" className="text-[11.5px] text-muted-foreground hover:text-foreground">
          ← 写経の一覧
        </Link>
        <header className="mt-3">
          <p className="text-[11px] text-muted-foreground">
            {languageLabel(active.language)}・{active.completions || 0}回写した
          </p>
          <h1 className="mt-1 font-heading text-2xl">{active.title}</h1>
          {active.source_problem_id && (
            <Link to={`/solve/${active.source_problem_id}`} className="mt-1 inline-block text-[11.5px] text-primary hover:underline">
              写し終えたら、もとの問題をもう一度解く →
            </Link>
          )}
          {active.summary && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{active.summary}</p>}
        </header>
        <div className="mt-5">
          <TraceSession
            key={active.id}
            drill={active}
            onUpdate={(d) => setDrills((prev) => (prev || []).map((x) => (x.id === d.id ? d : x)))}
            onStartNext={(g, from) => create(g, { language: from.language, from: from.id })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-16 pt-2 sm:px-8">
      <header>
        <h1 className="font-heading text-2xl">写経</h1>
      </header>

      <section className="mt-6 rounded-2xl border border-border/70 bg-card/80 p-5">
        <label className="text-[12px] font-medium">写経で身につけたいこと</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onPaste={(e) => {
            const files = imagesFromClipboard(e);
            if (files.length) att.add(files);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create();
          }}
          rows={2}
          placeholder="例: Pythonで、リストの中から条件に合うものだけ集める書き方（スクショだけでも作れます）"
          className="mt-2 w-full resize-none rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary/50"
        />
        <div className="mt-2">
          <ImageStrip images={att.images} onRemove={att.remove} />
          {att.error && <p className="mb-1.5 text-[10.5px] text-destructive">{att.error}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              att.add(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || att.images.length >= MAX_IMAGES}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ImagePlus className="h-3 w-3" />
            スクショを添付（{MAX_IMAGES}枚まで・貼り付けも可）
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGEST[language].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setGoal(s)}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border/70 p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLanguage(l.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11.5px]',
                  language === l.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border/70 p-0.5">
            {[
              { id: 'short', label: '短め（10〜25行）' },
              { id: 'long', label: '長め（25〜45行）' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                className={cn('rounded-md px-2.5 py-1 text-[11.5px]', size === s.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground')}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => create()}
            disabled={busy || att.uploading || (!goal.trim() && !att.ready.length)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? 'お手本を作っています…' : '写経の場を作る'}
          </button>
        </div>
      </section>

      {latestDone?.next_steps?.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[13px] font-medium">次のおすすめ（「{latestDone.title}」のあと）</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {latestDone.next_steps.map((n) => (
              <button
                key={n.title}
                type="button"
                disabled={busy}
                onClick={() => create(n.goal, { language: latestDone.language, from: latestDone.id })}
                className="rounded-xl border border-border/70 bg-card/70 p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
              >
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{n.step}</span>
                <span className="mt-1.5 block text-[12.5px] font-medium">{n.title}</span>
                {n.why && <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{n.why}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[13px] font-medium">これまでの写経</h2>
        {drills === null ? (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        ) : drills.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted-foreground">まだありません。上で身につけたいことを書くと、最初の写経ができます。</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {drills.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setParams({ id: d.id })}
                className="rounded-xl border border-border/70 bg-card/70 p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{d.title}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {languageLabel(d.language)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11.5px] text-muted-foreground">{d.goal}</p>
                <p className="mt-2 text-[10.5px] text-muted-foreground">
                  {d.completions ? `${d.completions}回・次は「${MODES[Math.min(d.level || 0, 2)].label}」` : 'まだ写していない'}
                  {d.problem_id ? '・練習問題あり' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
