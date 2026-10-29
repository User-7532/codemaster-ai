import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Timer, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { LANGUAGES } from '@/lib/languages';
import VerdictBadge from '@/components/VerdictBadge';

const LIMITS = [25, 40, 60];
const LEVELS = [
  { id: 'intermediate', label: '中級', desc: '国内企業の技術面接レベル' },
  { id: 'advanced', label: '上級', desc: '海外の大型テック水準' },
];

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [language, setLanguage] = useState('cpp');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [minutes, setMinutes] = useState(40);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    base44.entities.Submission.filter({ mode: 'interview' }, { sort: '-created_date', limit: 10 }).then((page) =>
      setHistory(page.items)
    );
  }, []);

  const start = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('generateProblem', {
        difficulty,
        language,
        topic: '',
        source: 'interview',
      });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/solve/${res.data.problem.id}?mode=interview&limit=${minutes}`);
    } catch (e) {
      toast({ title: '面接を始められませんでした', description: e.message, variant: 'destructive' });
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">MOCK INTERVIEW</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">時間を切って、1問を仕上げる</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          時間内に出すか、時間切れで自動提出。採点後に面接官目線の評価が返ります。
        </p>
      </header>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-5">
          <div>
            <p className="text-xs text-muted-foreground">言語</p>
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

          <div>
            <p className="text-xs text-muted-foreground">レベル</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setDifficulty(l.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    difficulty === l.id ? 'border-primary/50 bg-primary/8' : 'border-border/60 hover:border-border'
                  }`}
                >
                  <p className="text-xs text-foreground">{l.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">制限時間</p>
            <div className="mt-2 flex gap-1.5">
              {LIMITS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] transition-colors ${
                    minutes === m ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60'
                  }`}
                >
                  <Timer className="h-3 w-3" />
                  {m}分
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
            {busy ? '面接官が問題を準備しています…' : '面接を始める'}
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-amber-300/80" />
            <h2 className="text-xs">前回までの結果</h2>
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
              まだ記録がありません。最初の1本を始めてみましょう。
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-2">
                  <VerdictBadge verdict={h.verdict} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{h.problem_title}</span>
                  <span className="font-display text-[11px] text-foreground/70">{h.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}