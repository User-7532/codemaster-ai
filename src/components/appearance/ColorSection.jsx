import { accents } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import SectionCard from './SectionCard';

export default function ColorSection({ settings, update }) {
  return (
    <SectionCard title="ボタンの色" hint="押したときの気分で選ぶ">
      <div className="flex flex-wrap gap-2">
        {accents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => update({ accent: a.id })}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-colors',
              settings.accent === a.id
                ? 'border-primary/60 bg-primary/10 text-foreground'
                : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: `hsl(${a.hsl})` }} />
            {a.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        ボタンや強調表示の色が変わります。文字の読みやすさはそのままです。
      </p>
    </SectionCard>
  );
}