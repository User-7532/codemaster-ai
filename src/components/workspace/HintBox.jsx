import { Lightbulb, Loader2 } from 'lucide-react';

export default function HintBox({ hints, loading, onReveal, disabled }) {
  const canAsk = hints.length < 3;

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-amber-700/90" />
          ヒント（{hints.length} / 3）
        </span>
        {canAsk ? (
          <button
            type="button"
            onClick={onReveal}
            disabled={loading || disabled}
            className="flex items-center gap-1.5 rounded-full border border-border/80 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-amber-400/40 hover:text-amber-200 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {hints.length === 0 ? 'ヒントを見る' : 'もう少しヒント'}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">ここから先は自分の力で</span>
        )}
      </div>

      {hints.length === 0 ? (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground/70">
          まずは自分で手を動かしてみる。詰まったときだけ開いてください。
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {hints.map((h, i) => (
            <li key={i} className="rise-in rounded-lg bg-secondary/40 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              <span className="mr-1.5 font-display text-[10px] text-amber-700/90">HINT {i + 1}</span>
              <span className="whitespace-pre-wrap">{h}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}