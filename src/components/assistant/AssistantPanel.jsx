import { useEffect, useRef, useState } from 'react';
import { GripHorizontal, Loader2, Quote, Search, Send, X } from 'lucide-react';
import MessageSearch from '@/components/assistant/MessageSearch';

const CHIPS_NORMAL = [
  '記録から、私に役立つことを教えて',
  '次にやるといいことを提案して',
  '今日の進み具合を、やさしく評価して',
  '息抜きに、興味のありそうな話をして',
];
const CHIPS_QUOTE = ['どういう意味？', '詳しく説明して'];

export default function AssistantPanel({
  messages,
  busy,
  onSend,
  onClose,
  onLoadFrom,
  quote = '',
  onClearQuote,
  onQuote,
  dragProps,
  dragging,
}) {
  const [draft, setDraft] = useState('');
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const msgRefs = useRef({});
  // 読み込みを待ってから移動する発言のID
  const pendingJump = useRef(null);

  const scrollToMessage = (id) => {
    const el = msgRefs.current[id];
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  };

  useEffect(() => {
    // 検索から移動する途中なら、最下部ではなくその発言へ移動する
    if (pendingJump.current) {
      scrollToMessage(pendingJump.current);
      pendingJump.current = null;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, busy]);

  // 検索候補を閉じてから、選んだ発言の位置までスクロールする（目印は付けない）
  const jumpTo = (m) => {
    setSearching(false);
    if (msgRefs.current[m.id]) {
      setTimeout(() => scrollToMessage(m.id), 0);
      return;
    }
    // 画面にまだない古い発言は、読み込んでから移動する
    if (!onLoadFrom || !m.created_date) return;
    pendingJump.current = m.id;
    onLoadFrom(m.created_date);
  };

  // 開いたとき・引用が入ったときに、すぐ入力できるようキャレットを置く
  useEffect(() => {
    // クリック処理のあとで確実にフォーカスが残るよう、次の描画タイミングで置く
    const timer = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, 0);
    return () => clearTimeout(timer);
  }, [quote]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
  };

  // 引用があるときは、その部分についての聞き方だけを出す
  const chips = quote ? CHIPS_QUOTE : CHIPS_NORMAL;

  // サジェストは送らずに、入力欄の末尾へ入れて手を加えられるようにする
  const fill = (text) => {
    setDraft(text);
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    requestAnimationFrame(() => el.setSelectionRange(text.length, text.length));
  };

  return (
    <div className="rise-in flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl backdrop-blur">
      <div
        {...dragProps}
        className={`flex touch-none select-none items-center justify-between border-b border-border/60 px-4 py-2.5 ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="ドラッグで移動できます"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-[11px] font-medium text-foreground">学習アシスタント</p>
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`rounded-full p-1 transition-colors hover:bg-accent/60 hover:text-foreground ${
              searching ? 'text-primary' : 'text-muted-foreground'
            }`}
            title="これまでの会話を検索"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            title="閉じる"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {searching && (
        <MessageSearch onPick={jumpTo} />
      )}

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
            <div
              key={m.id}
              ref={(el) => {
                msgRefs.current[m.id] = el;
              }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary/12 text-foreground'
                    : 'border border-border/60 bg-background/70 text-foreground/90'
                }`}
              >
                {m.quote && (
                  <p className="mb-1.5 border-l-2 border-primary/40 pl-2 text-[10px] leading-relaxed text-muted-foreground">
                    {m.quote}
                  </p>
                )}
                {m.content}
              </div>
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
        {quote && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2 py-1.5">
            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
            <p className="max-h-16 flex-1 overflow-y-auto text-[10px] leading-relaxed text-muted-foreground">{quote}</p>
            <button
              type="button"
              onClick={onClearQuote}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              title="引用を外す"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => fill(c)}
              disabled={busy}
              className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
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
            placeholder={quote ? 'この部分について、どう聞きますか？' : '何でも聞いてください'}
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