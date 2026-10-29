import { cn } from '@/lib/utils';

const map = {
  correct: { label: '正解', cls: 'text-teal-800 border-teal-700/25 bg-teal-600/10' },
  partial: { label: 'あと一歩', cls: 'text-amber-800 border-amber-700/25 bg-amber-500/15' },
  wrong: { label: '不正解', cls: 'text-rose-800 border-rose-700/25 bg-rose-500/10' },
};

export default function VerdictBadge({ verdict, className }) {
  const item = map[verdict] || map.wrong;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]', item.cls, className)}>
      {item.label}
    </span>
  );
}