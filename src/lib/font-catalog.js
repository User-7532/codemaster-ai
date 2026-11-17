// 選べるフォントの一覧。Google Fonts のものは、選んだときにだけ読み込む
// kind: ja=和文 / latin=欧文 / mono=等幅 / system=端末に入っている字体
const g = (name, kind, note = '') => ({
  id: `g:${name}`,
  name,
  kind,
  note,
  google: name.replace(/ /g, '+'),
  stack: `'${name}', 'Noto Sans JP', sans-serif`,
});

export const FONT_CATALOG = [
  g('Noto Sans JP', 'ja', '定番のゴシック'),
  g('Noto Serif JP', 'ja', '定番の明朝'),
  g('BIZ UDPGothic', 'ja', '読みやすさ重視'),
  g('BIZ UDPMincho', 'ja', '読みやすい明朝'),
  g('M PLUS 1p', 'ja', 'すっきり'),
  g('M PLUS Rounded 1c', 'ja', '丸くて親しみやすい'),
  g('Zen Kaku Gothic New', 'ja', '端正なゴシック'),
  g('Zen Maru Gothic', 'ja', 'やわらかい丸ゴシック'),
  g('Zen Old Mincho', 'ja', '古風な明朝'),
  g('Shippori Mincho', 'ja', '上品な明朝'),
  g('Hina Mincho', 'ja', '細い明朝'),
  g('IBM Plex Sans JP', 'ja', '技術系のゴシック'),
  g('Murecho', 'ja', 'モダンなゴシック'),
  g('Sawarabi Gothic', 'ja', 'あっさり'),
  g('Kosugi Maru', 'ja', '丸ゴシック'),
  g('Kiwi Maru', 'ja', '素朴な丸'),
  g('Klee One', 'ja', '手書き風'),
  g('Yomogi', 'ja', 'ゆるい手書き'),
  g('Zen Kurenaido', 'ja', '筆ペン風'),
  g('Kaisei Decol', 'ja', '装飾的な明朝'),
  g('Yusei Magic', 'ja', 'マーカー風'),
  g('RocknRoll One', 'ja', '太くて元気'),
  g('Mochiy Pop One', 'ja', 'ポップ'),
  g('Dela Gothic One', 'ja', '極太'),
  g('DotGothic16', 'ja', 'ドット文字'),
  g('Inter', 'latin', 'UIの定番'),
  g('Roboto', 'latin', 'Androidの字体'),
  g('Lato', 'latin', 'やわらかい'),
  g('Montserrat', 'latin', '幾何学的'),
  g('Poppins', 'latin', '丸みのある幾何学'),
  g('Space Grotesk', 'latin', '少し個性的'),
  g('Playfair Display', 'latin', '雑誌の見出し'),
  g('Cormorant Garamond', 'latin', '静かなセリフ'),
  g('EB Garamond', 'latin', '古典的なセリフ'),
  g('Lora', 'latin', '読みやすいセリフ'),
  g('DM Serif Display', 'latin', '太いセリフ'),
  g('Abril Fatface', 'latin', '極太セリフ'),
  g('Bebas Neue', 'latin', '縦長の大文字'),
  g('Oswald', 'latin', '細長い'),
  g('Righteous', 'latin', 'レトロ'),
  g('Pacifico', 'latin', 'ゆるい筆記体'),
  g('Caveat', 'latin', '手書き'),
  g('Dancing Script', 'latin', '筆記体'),
  g('Great Vibes', 'latin', '華やかな筆記体'),
  g('Lobster', 'latin', '太い筆記体'),
  { ...g('JetBrains Mono', 'mono', 'コード用'), stack: "'JetBrains Mono', ui-monospace, monospace" },
  { ...g('Fira Code', 'mono', 'リガチャ付き'), stack: "'Fira Code', ui-monospace, monospace" },
  { ...g('IBM Plex Mono', 'mono', '技術系'), stack: "'IBM Plex Mono', ui-monospace, monospace" },
  { ...g('Source Code Pro', 'mono', '定番'), stack: "'Source Code Pro', ui-monospace, monospace" },
  { id: 'sys:hiragino', name: 'ヒラギノ角ゴ', kind: 'system', note: 'Mac・iPhone', stack: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif" },
  { id: 'sys:yugothic', name: '游ゴシック', kind: 'system', note: 'Windows・Mac', stack: "'Yu Gothic', YuGothic, sans-serif" },
  { id: 'sys:yumincho', name: '游明朝', kind: 'system', note: 'Windows・Mac', stack: "'Yu Mincho', YuMincho, serif" },
  { id: 'sys:meiryo', name: 'メイリオ', kind: 'system', note: 'Windows', stack: "Meiryo, sans-serif" },
];

export const FONT_KINDS = [
  { id: 'all', label: 'すべて' },
  { id: 'ja', label: '和文' },
  { id: 'latin', label: '欧文' },
  { id: 'mono', label: '等幅' },
  { id: 'mine', label: '自分の' },
];

export const PREVIEW_TEXT = 'あア永Aa';

// 自分で追加したフォントファイル
export const customFamily = (id) => `CMCustom-${id}`;
export const customEntry = (f) => ({
  id: `c:${f.id}`,
  name: f.name,
  kind: 'mine',
  note: '追加したファイル',
  url: f.url,
  family: customFamily(f.id),
  stack: `'${customFamily(f.id)}', 'Noto Sans JP', sans-serif`,
});

export function findFont(id, customFonts = []) {
  if (!id) return null;
  if (id.startsWith('c:')) {
    const f = customFonts.find((c) => `c:${c.id}` === id);
    return f ? customEntry(f) : null;
  }
  return FONT_CATALOG.find((f) => f.id === id) || null;
}

const loadedLinks = new Set();
function addLink(href) {
  if (typeof document === 'undefined' || loadedLinks.has(href)) return;
  loadedLinks.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const loadedFaces = new Set();
export function ensureFont(entry) {
  if (!entry) return;
  if (entry.google) addLink(`https://fonts.googleapis.com/css2?family=${entry.google}&display=swap`);
  if (entry.url && typeof FontFace !== 'undefined' && !loadedFaces.has(entry.family)) {
    loadedFaces.add(entry.family);
    new FontFace(entry.family, `url(${entry.url})`)
      .load()
      .then((face) => document.fonts.add(face))
      .catch(() => loadedFaces.delete(entry.family));
  }
}

// 一覧の見本だけを読むときは、見本の文字だけに絞って軽く読み込む
export function ensurePreviews(entries) {
  const google = entries.filter((e) => e.google).map((e) => `family=${e.google}`);
  for (let i = 0; i < google.length; i += 20) {
    addLink(`https://fonts.googleapis.com/css2?${google.slice(i, i + 20).join('&')}&text=${encodeURIComponent(PREVIEW_TEXT + 'CodeMaster')}&display=swap`);
  }
  entries.filter((e) => e.url).forEach(ensureFont);
}
