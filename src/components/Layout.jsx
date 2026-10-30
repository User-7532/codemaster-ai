import { Outlet } from 'react-router-dom';
import NavSidebar from '@/components/NavSidebar';
import WallpaperLayer from '@/components/WallpaperLayer';
import AssistantChat from '@/components/assistant/AssistantChat';
import SelectionAsk from '@/components/assistant/SelectionAsk';
import PageTransition from '@/components/PageTransition';
import BackButton from '@/components/BackButton';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <WallpaperLayer />
      <NavSidebar />
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <div className="px-5 pt-4 sm:px-8">
          <BackButton />
        </div>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <AssistantChat />
      <SelectionAsk />
    </div>
  );
}