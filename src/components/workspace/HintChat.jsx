import { useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Loader2, MessagesSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const SUGGESTIONS = {
  cpp: ['for 文の書き方', 'vector の宣言と追加', '関数の定義と戻り値', 'cout で出力する書式'],
  c: ['for 文の書き方', '配列の宣言と初期化', 'malloc と free の使い方', 'printf の書式指定子'],
  python: ['for 文の書き方', 'リストの宣言と追加', '関数の定義とreturn', 'print の書式'],
};

export default function HintChat({ problemId, language, code }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('hintChat', {
        problem_id: problemId,
        language,
        code,
        messages: next,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      toast({ title: '答えを受け取れませんでした', description: e.message, variant: 'destructive' });
      setMessages(messages);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <MessagesSquare className="h-3.5 w-3.5 text-primary/80" />
        <span className="text-xs text-foreground">文法・語彙を聞く</span>
        <span className="ml-1 hidden text-[10px] text-muted-foreground/70 sm:inline">
          解き方は出しません。書き方だけ答えます
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/60">
          <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  書き方で詰まったら、そのまま聞いてください。使っている言語に合わせて例を出します。
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(SUGGESTIONS[language] || SUGGESTIONS.cpp).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <p
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-[11px] leading-relaxed text-foreground'
                        : 'max-w-[92%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-secondary/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/90'
                    }
                  >
                    {m.content}
                  </p>
                </div>
              ))
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> 書き方を確認しています…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="例：文字列を1文字ずつ見る書き方は？"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}