import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAppearance from '@/hooks/use-appearance';
import BackgroundSection from '@/components/appearance/BackgroundSection';
import ColorSection from '@/components/appearance/ColorSection';
import FontSection from '@/components/appearance/FontSection';
import LogoSection from '@/components/appearance/LogoSection';

export default function Appearance() {
  const [settings, update] = useAppearance();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link to="/" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> ホームへ戻る
      </Link>
      <h1 className="mt-3 font-display text-2xl tracking-tight sm:text-3xl">見た目</h1>

      <div className="mt-7 space-y-4">
        <BackgroundSection settings={settings} update={update} />
        <ColorSection settings={settings} update={update} />
        <FontSection settings={settings} update={update} />
        <LogoSection settings={settings} update={update} />
      </div>
    </div>
  );
}