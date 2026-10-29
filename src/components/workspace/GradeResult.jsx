import { Check, X, MessageSquare, Gauge } from 'lucide-react';
import VerdictBadge from '@/components/VerdictBadge';

export default function GradeResult({ result, onOpenMentor }) {
  if (!result) return null;

  return (
    <div className="rise-in rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={result.verdict} />
        <span className="font-display text-lg leading-none">
          {result.score}
          <span className="ml-0.5 text-[11px] font-body text-muted-foreground">点</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Gauge className="h-3 w-3" />
          時間 {result.time_complexity || '-'} / メモリ {result.space_complexity || '-'}
        </span>
        <button
          type="button"
          onClick={onOpenMentor}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[11px] text-primary transition-colors hover:bg-primary/25"
        >
          <MessageSquare className="h-3 w-3" />
          AIメンターと話す
        </button>
      </div>

      {(result.test_results || []).length > 0 && (
        <ul className="mt-3.5 space-y-1.5">
          {result.test_results.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px]">
              <span className={t.passed ? 'mt-0.5 text-teal-600' : 'mt-0.5 text-rose-600'}>
                {t.passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-mono text-foreground/80">{t.case}</span>
                {t.reason && <span className="ml-1.5 text-muted-foreground">{t.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.explanation && (
        <p className="mt-3.5 whitespace-pre-wrap rounded-lg bg-secondary/40 px-3 py-2.5 text-xs leading-relaxed text-foreground/85">
          {result.explanation}
        </p>
      )}

      {(result.issues || []).length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">直すと良くなる点</p>
          <ul className="mt-1.5 space-y-1">
            {result.issues.map((s, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                ・{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.interview_feedback && (
        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">面接官からの評価</p>
          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/85">{result.interview_feedback}</p>
        </div>
      )}
    </div>
  );
}