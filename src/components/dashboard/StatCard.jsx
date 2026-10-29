import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tones = {
  primary: 'text-primary bg-primary/10',
  mint: 'text-teal-700 bg-teal-600/10',
  amber: 'text-amber-700 bg-amber-500/15',
  violet: 'text-violet-700 bg-violet-600/10',
};

export default function StatCard({ icon: Icon, label, value, unit, hint, tone = 'primary', to }) {
  const base = 'group relative block overflow-hidden rounded-xl border border-border/70 bg-card/70 p-4 transition-colors';

  const body = (
    <>
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
    </>
  );

  if (!to) return <div className={cn(base, 'hover:border-border')}>{body}</div>;

  return (
    <Link to={to} className={cn(base, 'hover:border-primary/40')}>
      {body}
    </Link>
  );
}