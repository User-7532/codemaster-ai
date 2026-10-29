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
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

const primaryItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard, end: true },
  { to: '/curriculum', label: '問題', icon: Layers },
  { to: '/generate', label: 'AI出題', icon: Sparkles },
  { to: '/review', label: '復習', icon: RotateCcw },
];

const allItems = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/curriculum', label: 'カリキュラム', icon: Layers },
  { to: '/generate', label: 'AI出題', icon: Sparkles },
  { to: '/interview', label: '模擬面接', icon: Timer },
  { to: '/knowledge', label: '知識モード', icon: BookOpen },
  { to: '/review', label: '復習', icon: RotateCcw },
  { to: '/stats', label: '弱点分析', icon: LineChart },
  { to: '/appearance', label: '見た目', icon: Palette },
];

const extraItems = allItems.filter((i) => !primaryItems.some((p) => p.to === i.to));

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
          <p className="leading-none">
            <BrandLogo className="text-xl leading-none" />
          </p>
          <p className="mt-2 text-[11px] tracking-wide text-muted-foreground">面接のための、手を動かす道場</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {allItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
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
          ))}
        </nav>
        <div className="px-5 py-5">
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            C++ / Python
            <br />
            基礎 → 低レイヤー → 大型テック
          </p>
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
                {extraItems.map(({ to, label, icon: Icon }) => (
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
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}