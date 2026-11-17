import { fonts } from '@/lib/appearance';
import SectionCard from './SectionCard';
import FontPicker from './FontPicker';

// 用意した組み合わせ（見出しと本文で字体を使い分ける）も、一覧の先頭から選べる
const presets = fonts.map((f) => ({ id: f.id, name: `${f.name}（組み合わせ）`, note: f.note, stack: f.heading }));

export default function FontSection({ settings, update }) {
  return (
    <SectionCard title="フォント" hint="見出しと本文が一緒に変わります">
      <FontPicker
        value={settings.font}
        onChange={(id) => update({ font: id })}
        settings={settings}
        update={update}
        presets={presets}
      />
    </SectionCard>
  );
}
