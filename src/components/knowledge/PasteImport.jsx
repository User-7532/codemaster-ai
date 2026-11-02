import { useState } from 'react';
import { ClipboardPaste, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ほかのAIとのやり取りを貼り付けて、そこから知識問題を作る小さな窓口
export default function PasteImport({ onCards }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const ready = text.trim().length >= 40;

  const run = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setNote('');
    try {
      const res = await base44.functions.invoke('generateKnowledge', {
        source: 'external',
        text: text.trim().slice(0, 60000),
        // 長い記録ほど話題が多いので、問題数も少しずつ増やす
        count: Math.min(24, Math.max(10, Math.ceil(text.trim().length / 2500))),
      });
      if (res.data?.error) throw new Error(res.data.error);
      const cards = res.data?.cards || [];
      if (cards.length === 0) {
        setNote(res.data?.reason || '問題を作れませんでした。');
        return;
      }
      setText('');
      setOpen(false);
      onCards(cards);
    } catch (e) {
      setNote(e.message || '問題を作れませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
          open
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/70 text-muted-foreground hover:text-foreground'
        }`}
        title="ほかのAIとの対話を貼り付けて、そこから問題を作ります"
      >
        <ClipboardPaste className="h-3 w-3" />
        他AIの会話から作る
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border/60 bg-card/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            ほかのAIとのやり取りをそのまま貼り付けてください。やり取りの中の知識を、抜けが出ないように順に問題にします。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={60000}
            placeholder="（例）AIとの対話をコピーして貼り付け"
            className="mt-2 w-full resize-y rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-[11.5px] leading-relaxed outline-none focus:border-primary/50"
          />
          {note && <p className="mt-1.5 text-[10px] text-rose-700">{note}</p>}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={run}
              disabled={busy || !ready}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              {busy ? '対話を読み取っています…' : 'この対話から問題を作る'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNote('');
              }}
              className="shrink-0 rounded-lg border border-border/70 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              閉じる
            </button>
          </div>
          <p className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
            <span>長い記録もそのまま貼り付けられます。</span>
            <span className="tabular-nums">{text.trim().length.toLocaleString()} / 60,000字</span>
          </p>
        </div>
      )}
    </div>
  );
}