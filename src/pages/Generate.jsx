import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { LANGUAGES } from '@/lib/languages';
import { topicWeakness } from '@/lib/insights';

const DIFFICULTIES = [
  { id: 'basic', label: '基礎', desc: '定石の型をそのまま使う' },
  { id: 'intermediate', label: '中級', desc: '中で何が起きるかを意識する' },
  { id: 'advanced', label: '上級', desc: '大型テックの面接水準' },
];

const TOPIC_CHIPS = ['配列', '文字列', 'スタック', 'グラフ', '動的計画法', 'ビット演算', 'メモリ管理', '木構造', '設計'];

export default function Generate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [language, setLanguage] = useState('cpp');
  const [weakTopics, setWeakTopics] = useState([]);
  const [existingTitles, setExistingTitles] = useState([]);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.Problem.filter({ source: 'ai' }, { sort: '-created_date', limit: 6 }).then((page) => {
      setRecent(page.items);
      setExistingTitles(page.items.map((p) => p.title));
    });
    base44.entities.Submission.list({ sort: '-created_date', limit: 100 }).then((page) =>
      setWeakTopics(topicWeakness(page.items, { minTotal: 2, limit: 4 }).map((t) => t.topic))
    );
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('generateProblem', {
        topic,
        request,
        difficulty,
        language,
        weak_topics: weakTopics,
        avoid_titles: existingTitles,
        source: 'ai',
      });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/solve/${res.data.problem.id}?mode=ai`);
    } catch (e) {
      toast({ title: '問題を作れませんでした', description: e.message, variant: 'destructive' });
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">AI PRACTICE</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">AIに問題を作ってもらう</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          苦手なところと希望を伝えると、その場で1問作ります。作った問題は記録に残ります。
        </p>
      </header>

      <div className="mt-7 space-y-6">
        <div>
          <label className="text-xs text-muted-foreground">こんな問題が欲しい（自由に書けます）</label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            placeholder="例：文字列を逆順にする問題。再帰は使わずに解きたい"
            className="mt-2 w-full resize-none rounded-lg border border-border/70 bg-card/70 px-3 py-2.5 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground/80">
            書いた内容をその場で読んで、AIが問題を作ります。空のままなら下のトピックから選びます。
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">トピック（空でもOK）</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例：スライディングウィンドウ、ヒープ"
            className="mt-2 w-full rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TOPIC_CHIPS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  topic === t
                    ? 'border-primary/40 text-primary'
                    : 'border-border/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {weakTopics.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-[11px] text-muted-foreground">最近の誤答が多かったトピック</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {weakTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-700 transition-colors hover:bg-rose-500/15"
                >
                  {t} を練習する
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">難易度</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  difficulty === d.id
                    ? 'border-primary/50 bg-primary/8'
                    : 'border-border/60 bg-card/40 hover:border-border'
                }`}
              >
                <p className="text-xs text-foreground">{d.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">使う言語</p>
          <div className="mt-2 flex gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLanguage(l.id)}
                className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                  language === l.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? '問題を準備しています…' : '問題を作る'}
        </button>

        {busy && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> 20〜40秒ほどかかります
          </p>
        )}

        {recent.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-[11px] text-muted-foreground">前に作った問題（もう一度解く）</p>
            <ul className="mt-2 divide-y divide-border/50">
              {recent.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/solve/${p.id}?mode=ai`)}
                    className="w-full py-2 text-left text-[11px] text-foreground/85 transition-colors hover:text-primary"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}