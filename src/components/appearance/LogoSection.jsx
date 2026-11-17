import { logoFonts } from '@/lib/appearance';
import FontPicker from './FontPicker';
import { Input } from '@/components/ui/input';
import SectionCard from './SectionCard';

const presets = logoFonts.map((f) => ({ id: f.id, name: f.name, note: f.note, stack: f.stack }));

export default function LogoSection({ settings, update }) {
  const name = settings.logoText || '';

  return (
    <SectionCard title="ロゴ" hint="名前と字体は本文とは別に決められます">
      <label className="block text-[11px] text-muted-foreground" htmlFor="logo-name">
        サイト名
      </label>
      <Input
        id="logo-name"
        value={name}
        maxLength={24}
        placeholder="CodeMaster"
        onChange={(e) => update({ logoText: e.target.value })}
        className="mt-1.5 h-9 rounded-lg bg-background/60 text-sm"
      />
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        空白を入れて2語にすると、うしろの語がボタンの色になります（例: Code Master）
      </p>

      <p className="mt-4 text-[11px] text-muted-foreground">ロゴの字体</p>
      <div className="mt-1.5">
        <FontPicker
          value={settings.logoFont}
          onChange={(id) => update({ logoFont: id })}
          settings={settings}
          update={update}
          presets={presets}
          sample={(name || 'CodeMaster').slice(0, 12)}
        />
      </div>
    </SectionCard>
  );
}