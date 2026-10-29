import { cn } from '@/lib/utils';

export default function StatCard({ icon: Icon, label, value, unit, hint, tone = 'primary' }) {
  const tones = {
    primary: 'text-primary bg-primary/10',
    mint: 'text-teal-300 bg-teal-400/10',
    amber: 'text-amber-300 bg-amber-400/10',
    violet: 'text-violet-300 bg-violet-400/10',
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/70 p-4 transition-colors hover:border-border">
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('grid h-7 w-7 place-items-center rounded-md', tones[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl leading-none tracking-tight text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-body font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}