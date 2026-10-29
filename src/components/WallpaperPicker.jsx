import { Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { wallpapers } from '@/lib/wallpapers';
import useWallpaper from '@/hooks/use-wallpaper';
import { cn } from '@/lib/utils';

export default function WallpaperPicker({ inline = false, compact = false }) {
  const [current, setCurrent] = useWallpaper();

  const options = (
    <div className="grid grid-cols-2 gap-2">
      {wallpapers.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => setCurrent(w.id)}
          className={cn(
            'overflow-hidden rounded-lg border text-left transition-colors',
            current === w.id
              ? 'border-primary/60 ring-1 ring-primary/30'
              : 'border-border/70 hover:border-primary/30'
          )}
        >
          <span className="block h-12 w-full" style={w.style} />
          <span className="block px-2 py-1.5">
            <span className="block text-[11px] text-foreground">{w.name}</span>
            <span className="block text-[10px] text-muted-foreground">{w.note}</span>
          </span>
        </button>
      ))}
    </div>
  );

  if (inline) return options;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground',
            compact ? 'h-8 w-8 justify-center' : 'px-3 py-1.5 text-[11px]'
          )}
          title="着せ替え（壁紙）"
        >
          <Palette className="h-3.5 w-3.5" />
          {!compact && '着せ替え'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-[11px] text-muted-foreground">壁紙を選ぶ</p>
        {options}
      </PopoverContent>
    </Popover>
  );
}