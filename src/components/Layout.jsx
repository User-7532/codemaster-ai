import { Outlet } from 'react-router-dom';
import NavSidebar from '@/components/NavSidebar';
import WallpaperLayer from '@/components/WallpaperLayer';
import AssistantChat from '@/components/assistant/AssistantChat';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <WallpaperLayer />
      <NavSidebar />
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <Outlet />
      </main>
      <AssistantChat />
    </div>
  );
}