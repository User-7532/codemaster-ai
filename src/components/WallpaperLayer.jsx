import useWallpaper from '@/hooks/use-wallpaper';
import { wallpapers } from '@/lib/wallpapers';

export default function WallpaperLayer() {
  const [id] = useWallpaper();
  const wallpaper = wallpapers.find((w) => w.id === id) || wallpapers[0];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={wallpaper.style}
    />
  );
}