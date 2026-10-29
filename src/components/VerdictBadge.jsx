import { cn } from '@/lib/utils';

const map = {
  correct: { label: '正解', cls: 'text-teal-300 border-teal-400/30 bg-teal-400/10' },
  partial: { label: 'あと一歩', cls: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
  wrong: { label: '不正解', cls: 'text-rose-300 border-rose-400/30 bg-rose-400/10' },
};

export default function VerdictBadge({ verdict, className }) {
  const item = map[verdict] || map.wrong;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]', item.cls, className)}>
      {item.label}
    </span>
  );
}