import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { backgrounds, colorPresets, photoFade, shuffles } from '@/lib/appearance';
import ImageEditor from './ImageEditor';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';
import SectionCard from './SectionCard';

export default function BackgroundSection({ settings, update }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const custom = settings.custom || [];
  const isPhoto = typeof settings.background === 'string' && settings.background.startsWith('http');
  const isColor = typeof settings.background === 'string' && /^#[0-9a-fA-F]{6}$/.test(settings.background);
  const fade = photoFade(settings);

  const [editing, setEditing] = useState(null);

  // 選んだ写真は、まず整える画面に出す
  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください');
      return;
    }
    setError('');
    setEditing(file);
  };

  const uploadEdited = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      update({ custom: [...custom, file_url], background: file_url });
      setEditing(null);
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
    <SectionCard title="背景" hint="写真・好きな色・用意した柄から選べます">
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

      {isPhoto && custom.length >= 2 && (
        <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>自分の写真を入れ替える</span>
          <span className="flex gap-1">
            {shuffles.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => update({ shuffle: m.id })}
                className={cn(
                  'rounded-full px-2.5 py-0.5',
                  (settings.shuffle || 'off') === m.id ? 'bg-primary/15 text-primary' : 'hover:text-foreground'
                )}
              >
                {m.name}
              </button>
            ))}
          </span>
        </div>
      )}

      {isPhoto && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>写真の見え方</span>
            <span>{fade >= 0.85 ? 'ほんのり' : fade >= 0.6 ? 'やわらかく' : fade >= 0.3 ? 'はっきり' : 'そのまま'}</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={0.9 - fade}
            onChange={(e) => update({ photoFade: Math.round((0.9 - Number(e.target.value)) * 100) / 100 })}
            className="mt-1.5 w-full accent-[hsl(var(--primary))]"
            aria-label="写真の見え方"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/80">
            <span>文字が読みやすい</span>
            <span>写真がよく見える</span>
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] text-muted-foreground">好きな色</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => update({ background: c })}
              className={cn(
                'h-7 w-7 rounded-full border transition-shadow',
                settings.background === c ? 'border-primary ring-2 ring-primary/30' : 'border-border/70 hover:border-primary/40'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label
            className={cn(
              'relative flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] text-muted-foreground hover:text-foreground',
              isColor && !colorPresets.includes(settings.background) ? 'border-primary ring-2 ring-primary/30' : 'border-border/70'
            )}
          >
            <span className="h-3.5 w-3.5 rounded-full border border-border/70" style={{ backgroundColor: isColor ? settings.background : '#ffffff' }} />
            自由に選ぶ
            <input
              type="color"
              value={isColor ? settings.background : '#f6f1e7'}
              onChange={(e) => update({ background: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
      <ImageEditor file={editing} onCancel={() => setEditing(null)} onDone={uploadEdited} />
    </SectionCard>
  );
}