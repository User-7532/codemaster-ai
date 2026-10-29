import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tones = {
  cyan: { dot: 'bg-cyan-600', bar: 'bg-cyan-600/80', text: 'text-cyan-800' },
  amber: { dot: 'bg-amber-600', bar: 'bg-amber-600/80', text: 'text-amber-800' },
  rose: { dot: 'bg-rose-600', bar: 'bg-rose-600/80', text: 'text-rose-800' },
};

export default function StageCard({ step, title, subtitle, solved, total, tone }) {
  const t = tones[tone];
  const pct = total ? Math.round((solved / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-border">
      <div className="flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
        <span className="font-display text-[11px] tracking-widest text-muted-foreground">STEP {step}</span>
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
      <div className="mt-3.5">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className={cn('font-display', t.text)}>{pct}%</span>
          <span className="text-muted-foreground">
            {solved} / {total} 問
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className={cn('h-full rounded-full transition-all', t.bar)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}