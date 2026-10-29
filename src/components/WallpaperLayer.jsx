import useAppearance from '@/hooks/use-appearance';
import { backgroundStyle } from '@/lib/appearance';

export default function WallpaperLayer() {
  const [settings] = useAppearance();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-all duration-700"
      style={backgroundStyle(settings)}
    />
  );
}