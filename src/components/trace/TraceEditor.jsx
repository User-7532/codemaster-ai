import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tokenClasses } from '@/lib/highlight';
import { autoIndent } from '@/lib/indent';
import { cn } from '@/lib/utils';

// 写経の入力欄。
// mode="ghost": お手本を薄く下に敷き、その上をなぞって書く（目を離さずに書ける）
// それ以外: ふつうの入力欄。書いた字のうち、お手本と違うところに赤い下地を付ける（mode="hidden" では付けない）
// 書いた字は下の層に色付きで描き、入力欄の字は透明にしてカーソルだけを見せる
//
// 行ごとに比べるので、1文字飛ばしてもその行の中だけが赤くなり、次の行からはまた正しく比べられる。

const leadingSpaces = (line) => (line.match(/^ */) || [''])[0];

export function compareLines(model, value) {
  const want = model.split('\n');
  const got = value.split('\n');
  let ok = 0;
  let bad = 0;
  got.forEach((line, i) => {
    const target = want[i] ?? '';
    for (let j = 0; j < line.length; j += 1) {
      if (line[j] === target[j]) ok += 1;
      else bad += 1;
    }
  });
  const total = model.replace(/\n/g, '').length || 1;
  return { ok, bad, total, progress: Math.min(1, ok / total) };
}

// 行末の空白と、最後の空行の違いは無視して、完全に写せたかを見る
export const sameCode = (a, b) => {
  const norm = (s) =>
    s
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .join('\n')
      .replace(/\n+$/, '');
  return norm(a) === norm(b);
};

const TraceEditor = forwardRef(function TraceEditor(
  { model, value, onChange, mode = 'ghost', language = 'python', autoIndentFromModel = true, onFirstKey },
  ref
) {
  const want = useMemo(() => model.split('\n'), [model]);
  const got = value.split('\n');
  const lineCount = Math.max(want.length, got.length);
  const widthCh = Math.max(...want.map((l) => l.length), ...got.map((l) => l.length), 30) + 2;
  const showMarks = mode !== 'hidden';
  const areaRef = useRef(null);
  const pendingCaret = useRef(null);
  // 日本語などを変換している間は、確定前の字を入力欄そのものに見せる（色付きの層にはまだ入っていないため）
  const [composing, setComposing] = useState(false);
  const colors = useMemo(() => tokenClasses(value, language), [value, language]);
  const lineStarts = useMemo(() => {
    const starts = [];
    let at = 0;
    value.split('\n').forEach((l) => {
      starts.push(at);
      at += l.length + 1;
    });
    return starts;
  }, [value]);

  // 字下げを足したときのカーソル位置は、画面に反映した直後に合わせる（遅れて合わせると、速く打った字が別の場所に入る）
  useLayoutEffect(() => {
    if (pendingCaret.current == null || !areaRef.current) return;
    areaRef.current.selectionStart = areaRef.current.selectionEnd = pendingCaret.current;
    pendingCaret.current = null;
  }, [value]);

  const setRefs = (el) => {
    areaRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  // 改行はキーボード（ブラウザ）に入れさせ、入ったあとで字下げだけを足す。
  // 改行キーを横取りすると、スマホのキーボードでは改行が二重に入ることがあるため。
  const handleChange = (e) => {
    const el = e.target;
    const next = el.value;
    const pos = el.selectionStart;
    const insertedNewline =
      next.length === value.length + 1 && next[pos - 1] === '\n' && next.slice(0, pos - 1) + next.slice(pos) === value;
    if (insertedNewline) {
      let withIndent;
      let caret;
      if (autoIndentFromModel && mode !== 'hidden') {
        // 次の行の字下げはお手本どおりに入れる（字下げの打ち込みで時間を使わない）
        const lineIndex = next.slice(0, pos).split('\n').length - 1;
        const indent = leadingSpaces(want[lineIndex] || '');
        withIndent = `${next.slice(0, pos)}${indent}${next.slice(pos)}`;
        caret = pos + indent.length;
      } else {
        const r = autoIndent({ value, start: pos - 1, end: pos - 1, language });
        withIndent = r.value;
        caret = r.caret;
      }
      if (withIndent !== next) pendingCaret.current = caret;
      onChange(withIndent);
      return;
    }
    onChange(next);
  };

  const handleKeyDown = (e) => {
    const el = e.target;
    onFirstKey?.();
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      pendingCaret.current = start + 4;
      onChange(`${value.slice(0, start)}    ${value.slice(el.selectionEnd)}`);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2b241c] bg-[#14110d] shadow-[0_2px_18px_-8px_rgba(52,44,36,0.5)]">
      <div className="flex max-h-[62vh] overflow-auto">
        <div
          aria-hidden
          className="sticky left-0 z-10 select-none border-r border-[#2b241c] bg-[#14110d] px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-[#8b7f6d]"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative shrink-0 font-mono text-[13px]" style={{ width: `calc(${widthCh}ch + 1.5rem)` }}>
          <pre
            aria-hidden
            className="pointer-events-none absolute inset-0 whitespace-pre px-3 py-3 font-mono text-[13px] leading-6"
          >
            {Array.from({ length: lineCount }, (_, i) => {
              const line = got[i];
              const target = want[i] ?? '';
              if (line === undefined) {
                return (
                  <div key={i} className="min-h-[1.5rem] text-[#ece3d6]/[0.18]">
                    {mode === 'ghost' ? target || ' ' : ' '}
                  </div>
                );
              }
              // 空の行も1行ぶんの高さを保つ（高さが0になると、下の行が上に詰まってずれる）
              return (
                <div key={i} className="min-h-[1.5rem]">
                  {Array.from(line).map((ch, j) => {
                    const wrong = ch !== target[j];
                    // 書いた字は種類ごとに色を付けて見せ、お手本と違うところには赤い下地を敷く
                    return (
                      <span
                        key={j}
                        className={cn(
                          composing ? 'text-transparent' : colors[lineStarts[i] + j] || 'text-[#ece3d6]',
                          showMarks && wrong && 'rounded-[2px] bg-[#c2603f]/55'
                        )}
                      >
                        {ch}
                      </span>
                    );
                  })}
                  {mode === 'ghost' && <span className="text-[#ece3d6]/[0.18]">{target.slice(line.length)}</span>}
                  {line.length === 0 && mode !== 'ghost' ? ' ' : ''}
                </div>
              );
            })}
          </pre>
          <textarea
            ref={setRefs}
            value={value}
            onChange={handleChange}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={(e) => {
              setComposing(false);
              onChange(e.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            rows={lineCount + 1}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            data-no-ask
            aria-label="写経の入力欄"
            className={cn(
              'relative block w-full resize-none overflow-hidden whitespace-pre bg-transparent px-3 py-3 font-mono text-[13px] leading-6 caret-[#f1b6a2] outline-none',
              composing ? 'text-[#ece3d6]' : 'text-transparent'
            )}
          />
        </div>
      </div>
    </div>
  );
});

export default TraceEditor;
