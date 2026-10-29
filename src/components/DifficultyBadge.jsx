import { cn } from '@/lib/utils';

const map = {
  basic: { label: '基礎', cls: 'text-cyan-800 border-cyan-700/25 bg-cyan-600/10' },
  intermediate: { label: '中級', cls: 'text-amber-800 border-amber-700/25 bg-amber-500/15' },
  advanced: { label: '上級', cls: 'text-rose-800 border-rose-700/25 bg-rose-500/10' },
};

export default function DifficultyBadge({ difficulty, className }) {
  const item = map[difficulty] || map.basic;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-4', item.cls, className)}>
      {item.label}
    </span>
  );
}