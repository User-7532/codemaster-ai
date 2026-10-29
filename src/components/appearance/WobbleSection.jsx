import { wobbles } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import SectionCard from './SectionCard';

export default function WobbleSection({ settings, update }) {
  const current = wobbles.find((w) => w.id === settings.wobble) || wobbles[1];

  return (
    <SectionCard title="ゆらぎ" hint="適度な予測誤差">
      <div className="grid grid-cols-3 gap-2">
        {wobbles.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => update({ wobble: w.id })}
            className={cn(
              'rounded-lg border px-2 py-2.5 text-center transition-colors',
              settings.wobble === w.id
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            <span className="block text-xs">{w.name}</span>
            <span className="mt-0.5 block text-[10px] leading-tight opacity-80">{w.note}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        いまは「{current.name}」。選んだ色が毎日ほんの少しだけずれて、同じ画面でも少しずつ違って見えます。先の読めない感じが、飽きずに続く助けになります。
      </p>
    </SectionCard>
  );
}