import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { importKnowledge } from '@/lib/external-import';
import { IMPORT_MAX, IMPORT_MIN } from '@/lib/external-import';
import { useToast } from '@/components/ui/use-toast';

// 拡張機能などから #t=... で渡された本文を読む（URLではなく # に載せるので、サーバーには届かない）
function readHandoff() {
  try {
    const h = window.location.hash || '';
    const m = h.match(/[#&]t=([^&]*)/);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    // 読めなければ空のまま
  }
  return '';
}

export default function Import() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 取り込み結果 { count }

  // 開いたとき、拡張から渡された本文を入れて、URLからは消す（戻る・共有で漏れないように）
  useEffect(() => {
    const t = readHandoff();
    if (t) {
      setText(t.slice(0, IMPORT_MAX));
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // 消せなくても取り込みはできる
      }
    }
  }, []);

  const run = async () => {
    const body = text.trim();
    if (body.length < IMPORT_MIN || busy) return;
    setBusy(true);
    setDone(null);
    try {
      const { cards } = await importKnowledge(body, []);
      setDone({ count: cards.length });
      if (cards.length) {
        toast({ title: `知識に取り込みました（${cards.length}問）`, description: '明日の復習から出てきます。' });
        setText('');
      } else {
        toast({ title: '取り込める知識が見つかりませんでした', description: '別の文章で試してみてください。' });
      }
    } catch (e) {
      toast({ title: '取り込めませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const tooShort = text.trim().length > 0 && text.trim().length < IMPORT_MIN;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl tracking-tight sm:text-3xl">知識に取り込む</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        スライドや解説ページ、ほかのAIとの会話など、覚えたい文章を取り込みます。知識カードを作って、明日の復習から出します。
      </p>

      {done && done.count > 0 ? (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-medium">{done.count}問を取り込みました</p>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            明日の復習から順に出てきます。今すぐ解きたいときは知識モードへ。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/review"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] text-primary-foreground transition-opacity hover:opacity-90"
            >
              復習へ <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/knowledge"
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              知識モードへ
            </Link>
            <button
              type="button"
              onClick={() => setDone(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              続けて取り込む
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={IMPORT_MAX}
            rows={12}
            placeholder="ここに取り込みたい文章を貼り付け（拡張機能から開くと自動で入ります）"
            className="w-full resize-y rounded-xl border border-border/70 bg-background/70 px-3.5 py-3 text-[13px] leading-relaxed outline-none focus:border-primary/50"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {tooShort ? `もう少し長く（${IMPORT_MIN}字以上）` : `${text.trim().length.toLocaleString()} 字`}
            </p>
            <button
              type="button"
              onClick={run}
              disabled={busy || text.trim().length < IMPORT_MIN}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12.5px] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
              {busy ? '取り込んでいます…' : '取り込む'}
            </button>
          </div>
          {busy && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              文章から問題を作っています。1分ほどかかることがあります。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
