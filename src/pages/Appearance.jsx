import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAppearance from '@/hooks/use-appearance';
import BackgroundSection from '@/components/appearance/BackgroundSection';
import ColorSection from '@/components/appearance/ColorSection';
import FontSection from '@/components/appearance/FontSection';
import WobbleSection from '@/components/appearance/WobbleSection';

export default function Appearance() {
  const [settings, update] = useAppearance();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <Link to="/" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> ホームへ戻る
      </Link>
      <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight">見た目を、自分のものに。</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        背景・ボタンの色・文字の形を選べます。しっくりくるほうを選ぶのが正解です。
      </p>

      <div className="mt-7 space-y-4">
        <BackgroundSection settings={settings} update={update} />
        <ColorSection settings={settings} update={update} />
        <FontSection settings={settings} update={update} />
        <WobbleSection settings={settings} update={update} />
      </div>
    </div>
  );
}