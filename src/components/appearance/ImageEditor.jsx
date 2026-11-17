import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Loader2, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MAX_SIDE = 2560;

const ASPECTS = [
  { id: 'screen', label: '画面に合わせる' },
  { id: 'original', label: '元の形' },
  { id: 'wide', label: '16:9', value: 16 / 9 },
  { id: 'tall', label: '9:16', value: 9 / 16 },
  { id: 'square', label: '1:1', value: 1 },
];

const ADJUSTS = [
  { id: 'brightness', label: '明るさ' },
  { id: 'contrast', label: 'コントラスト' },
  { id: 'saturate', label: '彩度' },
];

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// 回転させた画像全体の大きさ
function rotatedSize(w, h, deg) {
  const r = (deg * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(r) * w) + Math.abs(Math.sin(r) * h),
    height: Math.abs(Math.sin(r) * w) + Math.abs(Math.cos(r) * h),
  };
}

// 明るさ・コントラスト・彩度を画素ごとに直す（端末によって canvas の filter が効かないため）
function adjustPixels(ctx, w, h, { brightness, contrast, saturate }) {
  if (brightness === 100 && contrast === 100 && saturate === 100) return;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const b = brightness / 100;
  const c = contrast / 100;
  const s = saturate / 100;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i] * b;
    let g = px[i + 1] * b;
    let bl = px[i + 2] * b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    px[i] = gray + (r - gray) * s;
    px[i + 1] = gray + (g - gray) * s;
    px[i + 2] = gray + (bl - gray) * s;
  }
  ctx.putImageData(data, 0, 0);
}

async function renderEdited(src, area, rotation, adjust) {
  const img = await loadImage(src);
  const { width: bw, height: bh } = rotatedSize(img.width, img.height, rotation);
  const full = document.createElement('canvas');
  full.width = bw;
  full.height = bh;
  const fctx = full.getContext('2d');
  fctx.translate(bw / 2, bh / 2);
  fctx.rotate((rotation * Math.PI) / 180);
  fctx.drawImage(img, -img.width / 2, -img.height / 2);

  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height));
  const out = document.createElement('canvas');
  out.width = Math.round(area.width * scale);
  out.height = Math.round(area.height * scale);
  const ctx = out.getContext('2d');
  ctx.drawImage(full, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  adjustPixels(ctx, out.width, out.height, adjust);
  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.86));
}

// 背景にする写真を、トリミング・回転・明るさなどを整えてから保存する
export default function ImageEditor({ file, onCancel, onDone }) {
  const [src, setSrc] = useState(null);
  const [natural, setNatural] = useState(1);
  const [aspectId, setAspectId] = useState('screen');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState(null);
  const [adjust, setAdjust] = useState({ brightness: 100, contrast: 100, saturate: 100 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setSrc(url);
    loadImage(url).then((img) => setNatural(img.width / img.height)).catch(() => {});
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const aspect =
    aspectId === 'screen'
      ? window.innerWidth / window.innerHeight
      : aspectId === 'original'
        ? natural
        : ASPECTS.find((a) => a.id === aspectId).value;

  const filter = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturate}%)`;

  const save = async () => {
    if (!area || !src) return;
    setSaving(true);
    try {
      const blob = await renderEdited(src, area, rotation, adjust);
      const name = (file.name || 'wallpaper').replace(/\.[^.]+$/, '') + '.jpg';
      await onDone(new File([blob], name, { type: 'image/jpeg' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(v) => !v && !saving && onCancel()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">写真を整える</DialogTitle>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black sm:h-72">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_, px) => setArea(px)}
              style={{ mediaStyle: { filter } }}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAspectId(a.id)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px]',
                aspectId === a.id ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
          <span>拡大</span>
          <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <span className="w-9 text-right">{zoom.toFixed(1)}×</span>

          <span>回転</span>
          <input type="range" min="-180" max="180" step="1" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
          <button
            type="button"
            onClick={() => setRotation((r) => (((r + 90 + 180) % 360) + 360) % 360 - 180)}
            title="90度まわす"
            className="flex w-9 justify-end hover:text-foreground"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {ADJUSTS.map((a) => (
            <AdjustRow
              key={a.id}
              label={a.label}
              value={adjust[a.id]}
              onChange={(v) => setAdjust((prev) => ({ ...prev, [a.id]: v }))}
            />
          ))}
        </div>

        <div className="flex justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setRotation(0);
              setCrop({ x: 0, y: 0 });
              setAdjust({ brightness: 100, contrast: 100, saturate: 100 });
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            元に戻す
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full border border-border/70 px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              やめる
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !area}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[11px] text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              背景にする
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustRow({ label, value, onChange }) {
  return (
    <>
      <span>{label}</span>
      <input type="range" min="50" max="150" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="w-9 text-right">{value - 100 > 0 ? `+${value - 100}` : value - 100}</span>
    </>
  );
}
