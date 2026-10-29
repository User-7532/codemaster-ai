export const wallpapers = [
  {
    id: 'paper',
    name: '羊皮紙',
    note: '落ち着く、いつもの紙',
    style: {
      backgroundColor: 'hsl(39 42% 94%)',
      backgroundImage: `radial-gradient(110% 70% at 12% 0%, hsl(40 62% 93% / 0.95), transparent 62%),
        radial-gradient(90% 65% at 98% 6%, hsl(22 48% 90% / 0.6), transparent 60%),
        radial-gradient(hsl(30 25% 40% / 0.055) 1px, transparent 1px)`,
      backgroundSize: 'auto, auto, 19px 19px',
    },
  },
  {
    id: 'score',
    name: '五線譜',
    note: '音楽室の空気',
    style: {
      backgroundColor: 'hsl(40 46% 95%)',
      backgroundImage: `repeating-linear-gradient(to bottom,
          transparent 0 16px,
          hsl(28 26% 38% / 0.11) 16px 17px,
          transparent 17px 25px,
          hsl(28 26% 38% / 0.11) 25px 26px,
          transparent 26px 34px,
          hsl(28 26% 38% / 0.11) 34px 35px,
          transparent 35px 43px,
          hsl(28 26% 38% / 0.11) 43px 44px,
          transparent 44px 52px,
          hsl(28 26% 38% / 0.11) 52px 53px,
          transparent 53px 92px),
        radial-gradient(80% 60% at 85% 0%, hsl(14 50% 90% / 0.55), transparent 65%)`,
      backgroundSize: 'auto, auto',
    },
  },
  {
    id: 'map',
    name: '古地図',
    note: '地歴の散歩道',
    style: {
      backgroundColor: 'hsl(38 38% 93%)',
      backgroundImage: `repeating-linear-gradient(0deg, hsl(25 30% 40% / 0.075) 0 1px, transparent 1px 72px),
        repeating-linear-gradient(90deg, hsl(25 30% 40% / 0.075) 0 1px, transparent 1px 72px),
        repeating-radial-gradient(circle at 22% 34%, hsl(22 35% 40% / 0.05) 0 1px, transparent 1px 30px),
        repeating-radial-gradient(circle at 82% 78%, hsl(200 25% 40% / 0.045) 0 1px, transparent 1px 34px),
        radial-gradient(70% 55% at 50% 0%, hsl(40 55% 95% / 0.9), transparent 70%)`,
      backgroundSize: 'auto, auto, auto, auto, auto',
    },
  },
  {
    id: 'moon',
    name: '月光',
    note: '夜に少しだけ',
    style: {
      backgroundColor: 'hsl(210 26% 95%)',
      backgroundImage: `radial-gradient(70% 55% at 84% 4%, hsl(213 46% 89% / 0.95), transparent 64%),
        radial-gradient(60% 50% at 6% 10%, hsl(282 30% 92% / 0.9), transparent 60%),
        linear-gradient(180deg, hsl(210 30% 96%), hsl(38 40% 94%))`,
      backgroundSize: 'auto, auto, auto',
    },
  },
];

export const defaultWallpaper = wallpapers[0].id;