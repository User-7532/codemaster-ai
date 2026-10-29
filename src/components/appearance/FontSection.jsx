import { fonts } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import SectionCard from './SectionCard';

export default function FontSection({ settings, update }) {
  return (
    <SectionCard title="フォント" hint="見出しと本文が一緒に変わります">
      <div className="space-y-2">
        {fonts.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => update({ font: f.id })}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
              settings.font === f.id ? 'border-primary/60 bg-primary/5' : 'border-border/70 hover:border-primary/40'
            )}
          >
            <span>
              <span className="block text-xs text-foreground">{f.name}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{f.note}</span>
            </span>
            <span className="shrink-0 text-base text-foreground" style={{ fontFamily: f.heading }}>
              あアAa
            </span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}