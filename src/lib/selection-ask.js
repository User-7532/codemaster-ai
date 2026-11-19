const EVENT = 'codemaster:ask-selection';

// 選択した文章を「アシスタントへの引用」として渡す。context は、引用といっしょにAIへ渡す周りの情報（コード全体など）
export function askAboutSelection(text, context = '') {
  const value = String(text || '').trim();
  if (!value) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text: value, context: String(context || '') } }));
}

export function onAskSelection(handler) {
  const listener = (e) => {
    const d = e.detail;
    if (typeof d === 'string') handler(d, '');
    else handler(String(d?.text || ''), String(d?.context || ''));
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// コードの入力欄（黒いエディタ）で選んだ部分にも質問できるように、入力欄ごとに「周りの情報」の作り方を登録する
const codeContexts = new WeakMap();
export function registerCodeAsk(el, makeContext) {
  if (el) codeContexts.set(el, makeContext);
}
export function codeAskContext(el, start, end) {
  const fn = codeContexts.get(el);
  try {
    return fn ? String(fn(start, end) || '') : '';
  } catch {
    return '';
  }
}

// 選んだ位置の前後数行（行番号つき）
export function linesAround(code, start, end, pad = 6) {
  const lines = String(code || '').split('\n');
  const from = code.slice(0, start).split('\n').length - 1;
  const to = code.slice(0, end).split('\n').length - 1;
  const a = Math.max(0, from - pad);
  const b = Math.min(lines.length - 1, to + pad);
  const out = [];
  for (let i = a; i <= b; i += 1) out.push(`${String(i + 1).padStart(3, ' ')}${i >= from && i <= to ? '>' : ' '} ${lines[i]}`);
  return out.join('\n');
}
