import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function WeaknessBar({ topic, wrong, total, to }) {
  const rate = total ? Math.round((wrong / total) * 100) : 0;
  const tone = rate >= 60 ? 'bg-rose-400' : rate >= 40 ? 'bg-amber-400' : 'bg-teal-400';

  const body = (
    <>
      <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{topic}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(rate, 4)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-display text-[11px] text-muted-foreground">{rate}%</span>
    </>
  );

  if (!to) return <div className="flex items-center gap-3">{body}</div>;

  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg transition-colors hover:bg-accent/40"
      title={`${topic} を練習する`}
    >
      {body}
    </Link>
  );
}