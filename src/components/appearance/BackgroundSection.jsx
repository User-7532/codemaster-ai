import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { backgrounds } from '@/lib/appearance';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';
import SectionCard from './SectionCard';

export default function BackgroundSection({ settings, update }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const custom = settings.custom || [];

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      update({ custom: [...custom, file_url], background: file_url });
    } catch {
      setError('アップロードできませんでした。もう一度お試しください');
    } finally {
      setUploading(false);
    }
  };

  const remove = (url) => {
    const next = custom.filter((u) => u !== url);
    update({ custom: next, background: settings.background === url ? 'silk' : settings.background });
  };

  return (
    <SectionCard title="背景" hint="お気に入りの画像も使えます">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            type="button"
            onClick={() => update({ background: bg.id })}
            className={cn(
              'overflow-hidden rounded-lg border text-left transition-colors',
              settings.background === bg.id ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border/70 hover:border-primary/40'
            )}
          >
            <span className="block h-12 w-full" style={bg.style} />
            <span className="block px-2 py-1.5 text-[11px] text-foreground">{bg.name}</span>
          </button>
        ))}

        {custom.map((url) => (
          <div
            key={url}
            className={cn(
              'group relative overflow-hidden rounded-lg border transition-colors',
              settings.background === url ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border/70 hover:border-primary/40'
            )}
          >
            <button type="button" onClick={() => update({ background: url })} className="block w-full text-left">
              <Image src={url} alt="アップロードした壁紙" className="h-12 w-full" fittingType="fill" />
              <span className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-foreground">
                {settings.background === url && <Check className="h-3 w-3 text-primary" />}
                マイ壁紙
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(url)}
              title="この壁紙を消す"
              className="absolute right-1 top-1 rounded-full bg-card/90 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-[66px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? '送信中' : '画像を追加'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </SectionCard>
  );
}