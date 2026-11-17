import { useEffect } from 'react';
import useAppearance from '@/hooks/use-appearance';
import { backgroundStyle, currentBackground } from '@/lib/appearance';

export default function WallpaperLayer() {
  const [settings] = useAppearance();
  const isPhoto = String(currentBackground(settings) || '').startsWith('http');

  // 写真のときは、半透明の窓を濃くする（index.css の html.photo-bg）
  useEffect(() => {
    document.documentElement.classList.toggle('photo-bg', isPhoto);
  }, [isPhoto]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-all duration-700"
      style={backgroundStyle(settings)}
    />
  );
}
