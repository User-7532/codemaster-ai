import { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const QUICK = ['易しすぎる', '難しすぎる', 'ジャンルを広げたい', '実務に近づけたい'];

const DIFF_JA = { basic: '基礎', intermediate: '中級', advanced: '上級' };

export default function CurriculumAdvisor({ problems, onApplied }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const counts = (problems || []).reduce(
    (acc, p) => {
      if (acc[p.difficulty] !== undefined) acc[p.difficulty] += 1;
      return acc;
    },
    { basic: 0, intermediate: 0, advanced: 0 }
  );

  const ask = async () => {
    if (busy || !request.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('adviseCurriculum', { request });
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      onApplied?.();
      toast({ title: 'カリキュラムを調整しました', description: '内容を確認してみてください' });
    } catch (e) {
      toast({ title: '相談できませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
        <Sparkles className="h-3.5 w-3.5" /> AIに相談
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle className="font-display text-base tracking-tight">カリキュラムの相談</SheetTitle>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            難易度が合わない、ジャンルを増やしたい。そう思ったらここで伝えてください。AIが内容を見て調整します。
          </p>
        </SheetHeader>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5">基礎 {counts.basic}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5">中級 {counts.intermediate}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5">上級 {counts.advanced}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setRequest((prev) => (prev.trim() ? `${prev.trim().replace(/。$/, '')}、${q}` : q))}
                className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>

          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="例：配列と文字列ばかりで飽きてきた。グラフやメモリ系を増やして、少しだけ難しくしてほしい"
            className="resize-none rounded-lg bg-background/60 text-[13px] leading-relaxed"
          />

          <button
            type="button"
            onClick={ask}
            disabled={busy || !request.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {busy ? 'カリキュラムを見直しています…' : '相談して調整する'}
          </button>

          {result && (
            <div className="space-y-3 rounded-xl border border-border/70 bg-background/50 p-4">
              <p className="text-[13px] leading-relaxed text-foreground">{result.advice}</p>

              {(result.updated || []).length > 0 && (
                <div>
                  <p className="text-[10px] tracking-wide text-muted-foreground">難易度を変えた問題</p>
                  <ul className="mt-1.5 space-y-1">
                    {result.updated.map((u) => (
                      <li key={u.title} className="text-[11px] text-foreground/80">
                        {u.title}：{DIFF_JA[u.from] || u.from} → {DIFF_JA[u.to] || u.to}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(result.created || []).length > 0 && (
                <div>
                  <p className="text-[10px] tracking-wide text-muted-foreground">追加した問題</p>
                  <ul className="mt-1.5 space-y-1">
                    {result.created.map((c) => (
                      <li key={c.title} className="text-[11px] text-foreground/80">
                        {c.title}（{DIFF_JA[c.difficulty] || c.difficulty}）
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!(result.updated || []).length && !(result.created || []).length && (
                <p className="text-[11px] text-muted-foreground">問題の追加や変更はありませんでした。</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}