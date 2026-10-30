import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

const CHIPS = ['この画面の使い方は？', '次に何をやればいい？', '今日の進み具合は？'];

export default function AssistantPanel({ messages, busy, onSend, onClose }) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, busy]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-[11px] font-medium text-foreground">学習アシスタント</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          title="閉じる"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {messages === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            いま見ている画面と学習の記録を踏まえて答えます。
            <br />
            質問でも、相談でも、そのまま書いてください。
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary/12 text-foreground'
                    : 'border border-border/60 bg-background/70 text-foreground/90'
                }`}
              >
                {m.content}
              </p>
            </div>
          ))
        )}
        {busy && (
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> 考えています…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/60 px-3 py-2.5">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSend(c)}
              disabled={busy}
              className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="何でも聞いてください"
            className="max-h-24 min-h-9 flex-1 resize-none rounded-lg border border-border/70 bg-background/70 px-2.5 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !draft.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            title="送る"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}