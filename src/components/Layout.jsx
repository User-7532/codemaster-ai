import { Outlet } from 'react-router-dom';
import NavSidebar from '@/components/NavSidebar';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-background">
      <NavSidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}