import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  Timer,
  BookOpen,
  RotateCcw,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/curriculum', label: 'カリキュラム', icon: Layers },
  { to: '/generate', label: 'AI出題', icon: Sparkles },
  { to: '/interview', label: '模擬面接', icon: Timer },
  { to: '/knowledge', label: '知識モード', icon: BookOpen },
  { to: '/review', label: '復習', icon: RotateCcw },
  { to: '/stats', label: '弱点分析', icon: LineChart },
];

export default function NavSidebar() {
  return (
    <>
      {/* desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/70 bg-sidebar/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-5 pt-7 pb-6">
          <p className="font-display text-lg tracking-tight text-foreground leading-none">
            Code<span className="text-primary">Dojo</span>
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground tracking-wide">面接対策の道場</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/12 text-foreground'
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
        <div className="px-5 py-5 text-[11px] leading-relaxed text-muted-foreground/70">
          C++ / Python
          <br />
          基礎 → 低レイヤー → 大型テック
        </div>
      </aside>

      {/* mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur">
        <div className="flex items-stretch justify-between px-1">
          {items.map(({ to, label, icon: Icon, end }) => (
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
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}