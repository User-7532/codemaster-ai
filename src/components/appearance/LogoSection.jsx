import { logoFonts } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import SectionCard from './SectionCard';

export default function LogoSection({ settings, update }) {
  const name = settings.logoText || '';

  return (
    <SectionCard title="ロゴ" hint="名前と字体は本文とは別に決められます">
      <label className="block text-[11px] text-muted-foreground" htmlFor="logo-name">
        サイト名
      </label>
      <Input
        id="logo-name"
        value={name}
        maxLength={24}
        placeholder="CodeMaster"
        onChange={(e) => update({ logoText: e.target.value })}
        className="mt-1.5 h-9 rounded-lg bg-background/60 text-sm"
      />
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        空白を入れて2語にすると、うしろの語がボタンの色になります（例: Code Master）
      </p>

      <p className="mt-5 text-[11px] text-muted-foreground">ロゴの字体</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {logoFonts.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => update({ logoFont: f.id })}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
              settings.logoFont === f.id ? 'border-primary/60 bg-primary/5' : 'border-border/70 hover:border-primary/40'
            )}
          >
            <span>
              <span className="block text-xs text-foreground">{f.name}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{f.note}</span>
            </span>
            <span
              className={cn('shrink-0 text-sm text-primary', f.sampleClass)}
              style={{ fontFamily: f.stack }}
            >
              {f.sample}
            </span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}