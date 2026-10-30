export const WHOLE_LABEL = { tech: 'すべて', cert: '混合', corp: '混合' };

export const GENRES = [
  { id: 'all', label: 'すべて' },
  {
    id: 'tech',
    label: '技術',
    hint: '技術領域を入力',
    subs: ['C系', 'Python', 'OSIモデル', 'サイバーセキュリティ', 'すべて'],
  },
  {
    id: 'cert',
    label: '資格',
    hint: '資格名を入力',
    subs: ['応用情報', 'セキスペ', 'AWS', '混合'],
  },
  { id: 'business', label: 'ビジネス' },
  {
    id: 'corp',
    label: '企業',
    hint: '企業名を入力',
    subs: ['Google', 'AWS', 'Cisco', 'オラクル', 'Apple', 'FFRIセキュリティ', '混合'],
  },
  { id: 'chat', label: '会話から' },
];

export const isWhole = (genre, leaf) => !leaf || leaf === WHOLE_LABEL[genre];

export const domainOf = (genre, leaf) => (genre === 'business' ? 'business' : `${genre}:${leaf}`);

export function matchesSelection(card, genre, leaf) {
  if (genre === 'all') return true;
  if (genre === 'chat') return card.source === 'chat';
  if (genre === 'business') return card.domain === 'business';
  if (!card.domain || !card.domain.startsWith(`${genre}:`)) return false;
  return isWhole(genre, leaf) ? true : card.domain === domainOf(genre, leaf);
}

export function leafNames(genre, customs = []) {
  const base = GENRES.find((g) => g.id === genre)?.subs || [];
  const names = base.filter((n) => n !== WHOLE_LABEL[genre]);
  customs
    .filter((c) => c.genre === genre)
    .forEach((c) => {
      if (!names.includes(c.name)) names.push(c.name);
    });
  return names;
}

export function domainLabel(domain) {
  if (!domain) return '';
  if (domain === 'business') return 'ビジネス';
  const i = domain.indexOf(':');
  return i >= 0 ? domain.slice(i + 1) : domain;
}

export function parseSelection(value) {
  if (!value) return { genre: 'all', leaf: '' };
  if (GENRES.some((g) => g.id === value && g.id !== 'tech' && g.id !== 'cert' && g.id !== 'corp')) {
    return { genre: value, leaf: '' };
  }
  const i = value.indexOf(':');
  if (i < 0) return { genre: value, leaf: WHOLE_LABEL[value] || '' };
  return { genre: value.slice(0, i), leaf: value.slice(i + 1) };
}