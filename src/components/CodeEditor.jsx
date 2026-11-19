import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { highlight } from '@/lib/highlight';
import { languageFilename } from '@/lib/languages';
import { autoIndent } from '@/lib/indent';
import { linesAround, registerCodeAsk } from '@/lib/selection-ask';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const CLOSE_SET = new Set([')', ']', '}', '"', "'"]);

export default function CodeEditor({ value = '', onChange, language = 'cpp', minRows = 16 }) {
  const html = useMemo(() => highlight(value, language), [value, language]);
  const lineCount = Math.max(1, value.split('\n').length);
  const rows = Math.max(minRows, lineCount + 1);
  const areaRef = useRef(null);
  const pendingCaret = useRef(null);
  const [composing, setComposing] = useState(false);

  // 中身を書き換えたときは、描画の直後にカーソルを決めた位置に置き直す
  useLayoutEffect(() => {
    if (pendingCaret.current == null || !areaRef.current) return;
    areaRef.current.selectionStart = areaRef.current.selectionEnd = pendingCaret.current;
    pendingCaret.current = null;
  }, [value]);

  const emit = (next, at) => {
    pendingCaret.current = at;
    onChange(next);
  };

  // かっこ・引用符を自動で閉じる（写経の入力欄と同じ動き）
  const handleChange = (e) => {
    const el = e.target;
    const next = el.value;
    const pos = el.selectionStart;
    if (composing) {
      onChange(next);
      return;
    }
    const insertedOne = next.length === value.length + 1 && next.slice(0, pos - 1) + next.slice(pos) === value;
    const ch = insertedOne ? next[pos - 1] : '';

    // 閉じる字を打ったとき、すぐ後ろに同じ字があれば、新しく足さずにその上を進む
    if (ch && CLOSE_SET.has(ch) && next[pos] === ch && ((ch !== '"' && ch !== "'") || value[pos - 2] !== '\\')) {
      el.value = value;
      el.selectionStart = el.selectionEnd = pos;
      return;
    }
    // 開く字を打ったら、閉じる字も一緒に入れて、カーソルは間に置く
    if (ch && PAIRS[ch]) {
      const quote = ch === '"' || ch === "'";
      if (!quote || !/[\w\\]/.test(next[pos - 2] || '')) {
        emit(`${next.slice(0, pos)}${PAIRS[ch]}${next.slice(pos)}`, pos);
        return;
      }
    }
    // 空のかっこの中で1字消したら、閉じる字も一緒に消す
    const deletedOne = next.length === value.length - 1 && value.slice(0, pos) + value.slice(pos + 1) === next;
    if (deletedOne && PAIRS[value[pos]] && next[pos] === PAIRS[value[pos]]) {
      emit(next.slice(0, pos) + next.slice(pos + 1), pos);
      return;
    }
    onChange(next);
  };

  const handleKeyDown = (e) => {
    const el = e.target;

    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      const { value: next, caret } = autoIndent({
        value,
        start: el.selectionStart,
        end: el.selectionEnd,
        language,
      });
      emit(next, caret);
      return;
    }

    if (e.key !== 'Tab') return;
    e.preventDefault();
    const start = el.selectionStart;
    emit(`${value.slice(0, start)}    ${value.slice(el.selectionEnd)}`, start + 4);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2b241c] bg-[#14110d] shadow-[0_2px_18px_-8px_rgba(52,44,36,0.5)]">
      <div className="flex items-center gap-2 border-b border-[#2b241c] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#c2603f]" />
        <span className="font-mono text-[11px] text-[#c4b8a4]">{languageFilename(language)}</span>
      </div>
      <div className="flex max-h-[62vh] overflow-y-auto">
        <div
          aria-hidden
          className="select-none border-r border-[#2b241c] px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-[#8b7f6d]"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre
            aria-hidden
            className="pointer-events-none absolute inset-0 whitespace-pre-wrap px-3 py-3 font-mono text-[13px] leading-6 text-[#ece3d6] [overflow-wrap:anywhere]"
            dangerouslySetInnerHTML={{ __html: `${html}\n` }}
          />
          <textarea
            ref={(el) => {
              areaRef.current = el;
              registerCodeAsk(el, (a, b) => `【問題を解いている途中の、学習者のコード（> が選んだ行）】\n${linesAround(el.value, a, b, 10)}`);
            }}
            data-ask-code
            value={value}
            onChange={handleChange}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={(e) => {
              setComposing(false);
              onChange(e.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            rows={rows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="relative w-full resize-none whitespace-pre-wrap bg-transparent px-3 py-3 font-mono text-[13px] leading-6 text-transparent caret-[#f1b6a2] outline-none [overflow-wrap:anywhere]"
          />
        </div>
      </div>
    </div>
  );
}