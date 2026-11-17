import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  Timer,
  BookOpen,
  RotateCcw,
  LineChart,
  Menu,
  Palette,
  PenLine,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

const primaryItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard, end: true },
  { to: '/trace', label: '写経', icon: PenLine },
  { to: '/curriculum', label: '問題', icon: Layers },
  { to: '/review', label: '復習', icon: RotateCcw },
];

// 折りたたまない小さな見出しで区切る（全部の項目はいつも見えたまま）
const home = { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true };
const groups = [
  {
    label: '書く',
    items: [
      { to: '/trace', label: '写経', icon: PenLine },
      { to: '/curriculum', label: 'カリキュラム', icon: Layers },
      { to: '/generate', label: 'AI出題', icon: Sparkles },
      { to: '/interview', label: '模擬面接', icon: Timer },
    ],
  },
  {
    label: '覚える',
    items: [
      { to: '/knowledge', label: '知識モード', icon: BookOpen },
      { to: '/review', label: '復習', icon: RotateCcw },
    ],
  },
  {
    label: '振り返る',
    items: [{ to: '/stats', label: '弱点分析', icon: LineChart }],
  },
];
const settingsItem = { to: '/appearance', label: '見た目', icon: Palette };
const isPrimary = (i) => primaryItems.some((p) => p.to === i.to);

function SideLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

const GroupLabel = ({ children }) => (
  <p className="px-3 pb-1 pt-4 text-[10px] tracking-[0.14em] text-muted-foreground/70">{children}</p>
);

export default function NavSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-2.5 backdrop-blur lg:hidden">
        <NavLink to="/" className="flex items-center">
          <BrandLogo className="text-lg leading-none" />
        </NavLink>
        <NavLink
          to="/appearance"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          title="見た目を変える"
        >
          <Palette className="h-3.5 w-3.5" />
        </NavLink>
      </header>

      {/* desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur lg:flex">
        <div className="px-5 pb-6 pt-7">
          <NavLink to="/" className="inline-block leading-none" title="ダッシュボードへ">
            <BrandLogo className="text-xl leading-none" />
          </NavLink>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <SideLink {...home} />
          {groups.map((g) => (
            <div key={g.label}>
              <GroupLabel>{g.label}</GroupLabel>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <SideLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-3 py-3">
          <SideLink {...settingsItem} />
        </div>
      </aside>

      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="flex items-stretch">
          {primaryItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </NavLink>
          ))}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground">
              <Menu className="h-[18px] w-[18px]" />
              <span>メニュー</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-border bg-card p-0">
              <SheetHeader className="px-5 pb-1 pt-5 text-left">
                <SheetTitle className="font-display text-base tracking-tight">メニュー</SheetTitle>
              </SheetHeader>
              <div className="px-3 pb-8">
                {[...groups, { label: '', items: [settingsItem] }].map((g) => {
                  const items = g.items.filter((i) => !isPrimary(i));
                  if (!items.length) return null;
                  return (
                    <div key={g.label || 'settings'} className={g.label ? '' : 'mt-2 border-t border-border/60 pt-2'}>
                      {g.label && <GroupLabel>{g.label}</GroupLabel>}
                      {items.map(({ to, label, icon: Icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-foreground transition-colors hover:bg-accent/60"
                        >
                          <Icon className="h-4 w-4 text-primary/80" />
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}