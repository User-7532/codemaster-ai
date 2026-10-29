export const backgrounds = [
  {
    id: 'silk',
    name: '生成り',
    note: '布の目がすこしだけ',
    style: {
      backgroundColor: 'hsl(39 40% 94%)',
      backgroundImage: `repeating-linear-gradient(45deg, hsl(30 20% 45% / 0.035) 0 1px, transparent 1px 7px),
        repeating-linear-gradient(-45deg, hsl(30 20% 45% / 0.03) 0 1px, transparent 1px 9px),
        radial-gradient(80% 60% at 85% 0%, hsl(28 45% 92% / 0.7), transparent 70%)`,
    },
  },
  {
    id: 'sora',
    name: '空',
    note: '晴れた日の白',
    style: {
      backgroundColor: 'hsl(205 35% 95%)',
      backgroundImage: `radial-gradient(70% 55% at 78% 6%, hsl(200 60% 90% / 0.9), transparent 66%),
        radial-gradient(60% 50% at 8% 18%, hsl(190 40% 92% / 0.85), transparent 62%),
        linear-gradient(180deg, hsl(205 40% 96%), hsl(40 38% 95%))`,
    },
  },
  {
    id: 'dawn',
    name: '朝焼け',
    note: 'はじめる気分の色',
    style: {
      backgroundColor: 'hsl(24 45% 95%)',
      backgroundImage: `radial-gradient(80% 60% at 12% 4%, hsl(20 70% 91% / 0.95), transparent 64%),
        radial-gradient(70% 55% at 92% 12%, hsl(340 45% 92% / 0.8), transparent 62%),
        linear-gradient(180deg, hsl(28 50% 96%), hsl(45 45% 95%))`,
    },
  },
  {
    id: 'moss',
    name: '若葉',
    note: '目にやさしい緑',
    style: {
      backgroundColor: 'hsl(95 22% 94%)',
      backgroundImage: `radial-gradient(75% 55% at 88% 8%, hsl(140 30% 89% / 0.9), transparent 66%),
        radial-gradient(60% 45% at 6% 92%, hsl(85 28% 90% / 0.9), transparent 62%)`,
    },
  },
  {
    id: 'ink',
    name: '水墨',
    note: '墨を流したような静けさ',
    style: {
      backgroundColor: 'hsl(210 16% 94%)',
      backgroundImage: `radial-gradient(60% 45% at 20% 10%, hsl(210 14% 82% / 0.65), transparent 68%),
        radial-gradient(50% 40% at 85% 70%, hsl(215 16% 84% / 0.6), transparent 66%),
        radial-gradient(hsl(210 18% 30% / 0.05) 1px, transparent 1px)`,
      backgroundSize: 'auto, auto, 22px 22px',
    },
  },
  {
    id: 'grid',
    name: '方眼',
    note: '手を動かす人のため',
    style: {
      backgroundColor: 'hsl(40 35% 95%)',
      backgroundImage: `repeating-linear-gradient(0deg, hsl(30 25% 40% / 0.05) 0 1px, transparent 1px 26px),
        repeating-linear-gradient(90deg, hsl(30 25% 40% / 0.05) 0 1px, transparent 1px 26px)`,
    },
  },
];

export const accents = [
  { id: 'shu', name: '朱', hsl: '14 58% 44%', fg: '40 60% 97%' },
  { id: 'ai', name: '藍', hsl: '220 44% 40%', fg: '210 40% 98%' },
  { id: 'tokiwa', name: '常磐', hsl: '165 38% 30%', fg: '150 40% 97%' },
  { id: 'sumire', name: '菫', hsl: '286 26% 43%', fg: '290 40% 98%' },
  { id: 'kohaku', name: '琥珀', hsl: '32 68% 41%', fg: '40 60% 98%' },
  { id: 'sumi', name: '墨', hsl: '220 10% 26%', fg: '0 0% 98%' },
];

export const fonts = [
  {
    id: 'mincho',
    name: '明朝',
    note: '本を読むような落ち着き',
    heading: "'Shippori Mincho', 'Noto Serif JP', serif",
    body: "'Noto Sans JP', ui-sans-serif, system-ui, sans-serif",
    display: "'Cormorant Garamond', 'Shippori Mincho', serif",
  },
  {
    id: 'gothic',
    name: 'ゴシック',
    note: 'すっきり、情報が早く読める',
    heading: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
    body: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
    display: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
  },
  {
    id: 'maru',
    name: '丸ゴシック',
    note: 'やわらかく、肩の力が抜ける',
    heading: "'Zen Maru Gothic', 'Noto Sans JP', sans-serif",
    body: "'Zen Maru Gothic', 'Noto Sans JP', sans-serif",
    display: "'Zen Maru Gothic', 'Noto Sans JP', sans-serif",
  },
  {
    id: 'tegaraki',
    name: '手書き風',
    note: 'ノートに書く感覚',
    heading: "'Klee One', 'Shippori Mincho', serif",
    body: "'Noto Sans JP', ui-sans-serif, sans-serif",
    display: "'Klee One', 'Shippori Mincho', serif",
  },
];

export const wobbles = [
  { id: 'off', name: 'なし', note: '毎日まったく同じ色' },
  { id: 'subtle', name: '控えめ', note: '色味がほんの少しずれる' },
  { id: 'brisk', name: 'しっかり', note: '日にちごとに色が変わる' },
];

export const defaultAppearance = {
  background: 'silk',
  accent: 'shu',
  font: 'mincho',
  wobble: 'subtle',
  custom: [],
};

function dayShift(level) {
  if (level === 'off') return 0;
  const d = new Date();
  const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  const r = Math.sin(seed * 12.9898) * 43758.5453;
  const span = level === 'brisk' ? 16 : 6;
  return Math.round((r - Math.floor(r) - 0.5) * 2 * span);
}

function rotateHue(hsl, degrees) {
  const parts = String(hsl).match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!parts) return hsl;
  const hue = (parseFloat(parts[1]) + degrees + 360) % 360;
  return `${Math.round(hue)} ${parts[2]}% ${parts[3]}%`;
}

export function backgroundStyle(settings) {
  const value = settings?.background;
  const preset = backgrounds.find((b) => b.id === value);
  if (preset) return preset.style;
  if (typeof value === 'string' && value.startsWith('http')) {
    return {
      backgroundColor: 'hsl(39 40% 94%)',
      backgroundImage: `linear-gradient(hsl(39 45% 96% / 0.72), hsl(39 40% 94% / 0.82)), url(${value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return backgrounds[0].style;
}

export function applyAppearance(settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accent = accents.find((a) => a.id === settings?.accent) || accents[0];
  const shifted = rotateHue(accent.hsl, dayShift(settings?.wobble));

  root.style.setProperty('--primary', shifted);
  root.style.setProperty('--ring', shifted);
  root.style.setProperty('--chart-1', shifted);
  root.style.setProperty('--sidebar-primary', shifted);
  root.style.setProperty('--sidebar-ring', shifted);

  const font = fonts.find((f) => f.id === settings?.font) || fonts[0];
  root.style.setProperty('--font-heading', font.heading);
  root.style.setProperty('--font-body', font.body);
  root.style.setProperty('--font-display', font.display);
}