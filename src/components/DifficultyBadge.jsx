import { cn } from '@/lib/utils';

const map = {
  basic: { label: '基礎', cls: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10' },
  intermediate: { label: '中級', cls: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
  advanced: { label: '上級', cls: 'text-rose-300 border-rose-400/30 bg-rose-400/10' },
};

export default function DifficultyBadge({ difficulty, className }) {
  const item = map[difficulty] || map.basic;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-4', item.cls, className)}>
      {item.label}
    </span>
  );
}