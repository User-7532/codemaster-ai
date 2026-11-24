import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import NavSidebar from '@/components/NavSidebar';
import WallpaperLayer from '@/components/WallpaperLayer';
import AssistantChat from '@/components/assistant/AssistantChat';
import SelectionAsk from '@/components/assistant/SelectionAsk';
import PageTransition from '@/components/PageTransition';
import BackButton from '@/components/BackButton';

export default function Layout() {
  const { pathname } = useLocation();
  // コーディング画面（問題を解く・写経）は、ページごとスクロールせず画面内に収める（中身は各パネルが内部でスクロール）。
  // それ以外のページはこれまで通り（ページ全体が縦に伸びてスクロール）。
  const fit = pathname.startsWith('/solve/') || pathname === '/trace';
  return (
    <div className={cn('flex flex-col lg:flex-row', fit ? 'h-[100dvh] overflow-hidden' : 'min-h-screen')}>
      <WallpaperLayer />
      <NavSidebar />
      <main className={cn('min-w-0 flex-1', fit ? 'flex min-h-0 flex-col overflow-hidden' : 'pb-24 lg:pb-0')}>
        <div className={cn('px-5 pt-4 sm:px-8', fit && 'shrink-0')}>
          <BackButton />
        </div>
        {fit ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <PageTransition className="h-full">
              <Outlet />
            </PageTransition>
          </div>
        ) : (
          <PageTransition>
            <Outlet />
          </PageTransition>
        )}
      </main>
      <AssistantChat />
      <SelectionAsk />
    </div>
  );
}