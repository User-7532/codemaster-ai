import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FONT_CATALOG, FONT_KINDS, PREVIEW_TEXT, customEntry, ensurePreviews, previewStack } from '@/lib/font-catalog';
import { cn } from '@/lib/utils';

const FILE_EXT = /\.(ttf|otf|woff2?)$/i;
const MAX_BYTES = 8 * 1024 * 1024;

// 字体を選ぶ小さな窓。一覧は高さを決めてスクロールさせ、画面を縦にも横にも広げない
// presets: 用意した組み合わせ（[{id, name, stack}]）。一覧のいちばん上に出す
export default function FontPicker({ value, onChange, settings, update, presets = [], sample = PREVIEW_TEXT }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const custom = settings.customFonts || [];

  const mine = useMemo(() => custom.map(customEntry), [custom]);
  const all = useMemo(
    () => [...presets.map((p) => ({ ...p, kind: 'preset' })), ...mine, ...FONT_CATALOG],
    [presets, mine]
  );
  const current = all.find((f) => f.id === value) || presets[0];

  const shown = all.filter(
    (f) =>
      (kind === 'all' || f.kind === kind || (kind === 'ja' && f.kind === 'system')) &&
      (!query || `${f.name}${f.note || ''}`.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (open) ensurePreviews(shown);
  }, [open, kind, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!FILE_EXT.test(file.name)) return setError('ttf・otf・woff・woff2 のファイルを選んでください');
    if (file.size > MAX_BYTES) return setError('8MBまでのファイルにしてください');
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const entry = { id: Date.now().toString(36), name: file.name.replace(FILE_EXT, ''), url: file_url };
      update({ customFonts: [...custom, entry] });
      onChange(`c:${entry.id}`);
      setKind('mine');
    } catch {
      setError('読み込めませんでした。もう一度お試しください');
    } finally {
      setUploading(false);
    }
  };

  const removeCustom = (id) => {
    update({ customFonts: custom.filter((c) => `c:${c.id}` !== id) });
    if (value === id) onChange(presets[0]?.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-left transition-colors hover:border-primary/40"
        >
          <span className="min-w-0">
            <span className="block truncate text-xs text-foreground">{current?.name || '選ぶ'}</span>
            {current?.note && <span className="block truncate text-[10px] text-muted-foreground">{current.note}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-base" style={{ fontFamily: current?.stack }}>
              {sample}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <div className="flex items-center gap-1.5 rounded-md border border-border/70 px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前でさがす"
            className="h-8 w-full bg-transparent text-xs outline-none"
          />
        </div>
        <div className="mt-1.5 flex gap-1 overflow-x-auto">
          {FONT_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[11px]',
                kind === k.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        <ul className="mt-1.5 h-56 overflow-y-auto overscroll-contain">
          {shown.length === 0 && (
            <li className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              {kind === 'mine' ? '下のボタンからフォントファイルを追加できます' : '見つかりませんでした'}
            </li>
          )}
          {shown.map((f) => (
            <li key={f.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => {
                  onChange(f.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                  value === f.id && 'bg-primary/10'
                )}
              >
                <Check className={cn('h-3 w-3 shrink-0 text-primary', value === f.id ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 flex-1 truncate text-[12px]">{f.name}</span>
                <span className="shrink-0 text-[15px]" style={{ fontFamily: previewStack(f) }}>
                  {sample}
                </span>
              </button>
              {f.kind === 'mine' && (
                <button
                  type="button"
                  onClick={() => removeCustom(f.id)}
                  title="このフォントを消す"
                  className="ml-1 rounded p-1 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          フォントファイルを追加（ttf・otf・woff）
        </button>
        <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={addFile} className="hidden" />
        {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
