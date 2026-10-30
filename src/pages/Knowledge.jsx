import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { recordKnowledgeAnswer } from '@/lib/knowledge';
import ClozeCard from '@/components/knowledge/ClozeCard';
import WrittenCard from '@/components/knowledge/WrittenCard';
import DomainPicker from '@/components/knowledge/DomainPicker';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Knowledge() {
  const [cards, setCards] = useState(null);
  const [domain, setDomain] = useState(
    () => new URLSearchParams(window.location.search).get('domain') || 'all'
  );
  const [layer, setLayer] = useState('all');
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [light, setLight] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 300 }).then((page) => setCards(page.items));
  }, []);

  const filtered = useMemo(() => {
    const base = (cards || []).filter((c) => {
      if (domain === 'all') return true;
      if (domain === 'chat') return c.source === 'chat';
      if (c.domain !== domain) return false;
      if (domain === 'osi' && layer !== 'all') return c.topic === layer;
      return true;
    });
    return light ? base.filter((c) => c.kind !== 'written') : base;
  }, [cards, domain, layer, light]);

  useEffect(() => {
    setOrder(shuffle(filtered.map((_, i) => i)));
    setIdx(0);
    setRevealed(false);
    setTally({ correct: 0, wrong: 0 });
  }, [filtered]);

  const current = idx < order.length ? filtered[order[idx]] : null;

  const answer = (correct) => {
    if (!current) return;
    setTally((t) => ({ correct: t.correct + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) }));
    recordKnowledgeAnswer(current, correct, 'knowledge');
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  const skip = () => {
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  const restart = () => {
    setOrder(shuffle(filtered.map((_, i) => i)));
    setIdx(0);
    setRevealed(false);
    setTally({ correct: 0, wrong: 0 });
  };

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke(
        'generateKnowledge',
        domain === 'chat' ? { source: 'chat', count: 6 } : { source: 'topic', domain, count: 6 }
      );
      if (res.data?.error) throw new Error(res.data.error);
      const created = res.data?.cards || [];
      if (created.length === 0) {
        toast({
          title: 'まだ作れませんでした',
          description:
            domain === 'chat'
              ? 'アシスタントとの会話がもう少し増えると作れます'
              : res.data?.reason || '少し時間をおいてもう一度お試しください',
        });
        return;
      }
      setCards((prev) => [...created, ...(prev || [])]);
      toast({ title: `${created.length}問を追加しました`, description: 'この分野の並びに混ぜて出します' });
    } catch (e) {
      toast({ title: '問題を作れませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">KNOWLEDGE</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">知識を確かめる</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          穴埋めと記述で確かめます。穴埋めは赤シート式、記述はAIが判定します。
        </p>
      </header>

      <DomainPicker domain={domain} onDomain={setDomain} layer={layer} onLayer={setLayer} />

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {domain !== 'all' && (
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? '作成中…' : domain === 'chat' ? '会話から問題を作る' : 'AIに問題を足してもらう'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setLight((v) => !v)}
          className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
            light
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/70 text-muted-foreground hover:text-foreground'
          }`}
          title="急ぐときは記述問題を外して軽い穴埋めだけにします"
        >
          記述を外す
        </button>
      </div>

      {!cards ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border/60 bg-card/40 p-8 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-muted-foreground/50" />
          <p className="mt-3 text-xs text-muted-foreground">
            {domain === 'chat'
              ? 'アシスタントとの会話から作った問題はまだありません。'
              : 'この分野のカードはまだありません。'}
          </p>
        </div>
      ) : current ? (
        <>
          <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {idx + 1} / {order.length}
            </span>
            <span>
              正解 {tally.correct} ・ わからなかった {tally.wrong}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${((idx + 1) / order.length) * 100}%` }}
            />
          </div>

          <div className="mt-4">
            {current.kind === 'written' ? (
              <WrittenCard key={current.id} card={current} onResult={answer} onSkip={skip} />
            ) : (
              <>
                <ClozeCard card={current} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />
                <div className="mt-4 flex gap-2">
                  {!revealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="flex-1 rounded-lg border border-border/70 py-2.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      答えを見る
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => answer(false)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-700/25 bg-rose-500/10 py-2.5 text-[11px] text-rose-700 transition-colors hover:bg-rose-500/15"
                      >
                        <X className="h-3.5 w-3.5" /> わからなかった
                      </button>
                      <button
                        type="button"
                        onClick={() => answer(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-teal-700/25 bg-teal-500/10 py-2.5 text-[11px] text-teal-700 transition-colors hover:bg-teal-500/15"
                      >
                        <Check className="h-3.5 w-3.5" /> 言えた
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-border/60 bg-card/40 p-8 text-center">
          <p className="font-display text-lg">
            {tally.correct} / {tally.correct + tally.wrong} 正解
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">この分野はひととおり終わりました。</p>
          <button
            type="button"
            onClick={restart}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> もう一度
          </button>
        </div>
      )}
    </div>
  );
}