import { useRef, useState } from 'react';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const SUGGESTIONS = ['なぜその書き方になるの？', '別の解き方はある？', '計算量はどう考えればいい？'];

export default function MentorChat({ problemId, lastResult }) {
  const { toast } = useToast();
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
      const res = await base44.functions.invoke('mentorChat', {
        problem_id: problemId,
        messages: next,
        last_result: lastResult ? JSON.stringify(lastResult).slice(0, 4000) : '',
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      toast({ title: '返事を受け取れませんでした', description: e.message, variant: 'destructive' });
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
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs">AIメンター</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">やさしい言葉で解説します</span>
      </div>

      <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              採点の結果について、納得できるまで聞いてください。
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
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
                    : 'max-w-[92%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-secondary/50 px-3 py-2 text-[11px] leading-relaxed text-foreground/90'
                }
              >
                {m.content}
              </p>
            </div>
          ))
        )}
        {busy && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> 考えています…
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="疑問をそのまま書いてみる"
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
  );
}