import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { recordKnowledgeAnswer } from '@/lib/knowledge';
import {
  WHOLE_LABEL,
  isWhole,
  leafNames,
  matchesSelection,
  parseSelection,
} from '@/lib/knowledge-domains';
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
  const initial = parseSelection(new URLSearchParams(window.location.search).get('domain'));
  // 復習から「この1問」を指定して来たときのカードID
  const focusId = new URLSearchParams(window.location.search).get('card');

  const [ready, setReady] = useState(false);
  const [focusCard, setFocusCard] = useState(null);
  const [genre, setGenre] = useState(initial.genre);
  const [leaf, setLeaf] = useState(initial.leaf);
  const [customs, setCustoms] = useState([]);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [light, setLight] = useState(false);

  const cardsRef = useRef([]);
  const shownRef = useRef(new Set());
  const busyRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadCards = async () => {
      const page = await base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 300 });
      cardsRef.current = page.items || [];
      if (focusId) {
        const found = cardsRef.current.find((c) => c.id === focusId);
        const card = found || (await base44.entities.KnowledgeCard.get(focusId).catch(() => null));
        if (card) setFocusCard(card);
      }
      setReady(true);
    };
    loadCards();
    base44.entities.KnowledgeTopic.list({ limit: 100 }).then((page) => setCustoms(page.items || []));
  }, []);

  const poolFor = (g, l, onlyLight) =>
    shuffle(
      cardsRef.current.filter((c) => matchesSelection(c, g, l) && (!onlyLight || c.kind !== 'written'))
    );

  const fill = async (g = genre, l = leaf, onlyLight = light) => {
    if (busyRef.current) return;

    if (g === 'all') {
      const pool = poolFor('all', '', onlyLight);
      const fresh = pool.filter((c) => !shownRef.current.has(c.id));
      if (fresh.length < 3) shownRef.current = new Set();
      setDeck(fresh.length >= 3 ? fresh.slice(0, 10) : pool.slice(0, 10));
      setIdx(0);
      setRevealed(false);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setNote('');
    try {
      const payload =
        g === 'chat'
          ? { source: 'chat', count: 6 }
          : {
              genre: g,
              leaf: isWhole(g, l) ? '' : l,
              leaves: leafNames(g, customs),
              count: 6,
            };
      const res = await base44.functions.invoke('generateKnowledge', payload);
      if (res.data?.error) throw new Error(res.data.error);

      const created = (res.data?.cards || []).filter((c) => !onlyLight || c.kind !== 'written');
      if (created.length === 0) {
        setNote(res.data?.reason || '問題を用意できませんでした。少し待ってからもう一度お試しください。');
        return;
      }
      cardsRef.current = [...created, ...cardsRef.current];
      setDeck((prev) => {
        const known = new Set(prev.map((c) => c.id));
        return [...prev, ...created.filter((c) => !known.has(c.id) && matchesSelection(c, g, l))];
      });
    } catch (e) {
      setNote(e.message || '問題を用意できませんでした。');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    setRevealed(false);
    // 復習から指定された1問だけを出す
    if (focusCard) {
      setDeck([focusCard]);
      setIdx(0);
      setNote('');
      return;
    }
    shownRef.current = new Set();
    setTally({ correct: 0, wrong: 0 });
    setNote('');
    const pool = poolFor(genre, leaf, light);
    setDeck(pool.slice(0, 8));
    setIdx(0);
    if (pool.length < 3) fill(genre, leaf, light);
  }, [genre, leaf, light, ready, focusCard]);

  const current = deck[idx] || null;

  useEffect(() => {
    if (!ready || busy || current || note) return;
    if (genre === 'all' && deck.length === 0) return;
    fill();
  }, [ready, busy, current, note, genre, deck.length]);

  const advance = () => {
    // 指定された1問を終えたら、ふつうの出題に戻す
    if (focusCard) {
      setFocusCard(null);
      setRevealed(false);
      return;
    }
    const next = idx + 1;
    setIdx(next);
    setRevealed(false);
    if (next >= deck.length - 1) fill();
  };

  const answer = (correct) => {
    if (!current) return;
    shownRef.current.add(current.id);
    setTally((t) => ({ correct: t.correct + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) }));
    recordKnowledgeAnswer(current, correct, 'knowledge');
    advance();
  };

  const skip = () => {
    if (!current) return;
    shownRef.current.add(current.id);
    advance();
  };

  const chooseGenre = (g) => {
    if (g === genre) return;
    setGenre(g);
    setLeaf(['tech', 'cert', 'corp'].includes(g) ? WHOLE_LABEL[g] : '');
  };

  const addCustom = async (g, name) => {
    if (customs.some((c) => c.genre === g && c.name === name)) {
      setLeaf(name);
      return;
    }
    setLeaf(name);
    try {
      const rec = await base44.entities.KnowledgeTopic.create({ genre: g, name });
      setCustoms((prev) => [...prev, rec]);
      toast({ title: '候補に追加しました', description: '次からはこの名前を選ぶだけで始められます' });
    } catch (e) {
      toast({ title: '候補として保存できませんでした', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <header>
        <p className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">KNOWLEDGE</p>
        <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">知識を確かめる</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          選んだ分野に合わせてAIが問題を用意します。正答が続けば難しく、崩れたら基礎に戻ります。
        </p>
      </header>

      <DomainPicker
        genre={genre}
        leaf={leaf}
        customs={customs}
        onGenre={chooseGenre}
        onLeaf={setLeaf}
        onAddCustom={addCustom}
      />

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          正解 {tally.correct} ・ わからなかった {tally.wrong}
        </span>
      </div>

      {!ready ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : current ? (
        <div className="mt-4">
          {busy && (
            <p className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Loader2 className="h-3 w-3 animate-spin" /> 次の問題を用意しています
            </p>
          )}
          {current.kind === 'written' ? (
            <WrittenCard key={current.id} card={current} onResult={answer} onSkip={skip} />
          ) : (
            <>
              <ClozeCard
                key={current.id}
                card={current}
                revealed={revealed}
                onToggle={() => setRevealed((v) => !v)}
              />
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
      ) : busy ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">問題を用意しています</p>
        </div>
      ) : note ? (
        <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-6 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{note}</p>
          <button
            type="button"
            onClick={() => fill()}
            className="mt-3 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            もう一度試す
          </button>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border/60 bg-card/40 p-8 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-muted-foreground/50" />
          <p className="mt-3 text-xs text-muted-foreground">
            {genre === 'all'
              ? 'まだカードがありません。分野を選ぶと問題を用意します。'
              : '問題を用意しています。'}
          </p>
        </div>
      )}
    </div>
  );
}