import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tokenClasses } from '@/lib/highlight';
import { autoIndent } from '@/lib/indent';
import { cn } from '@/lib/utils';

// 写経の入力欄。
// mode="ghost": お手本を薄く下に敷き、その上をなぞって書く（目を離さずに書ける）
// それ以外: ふつうの入力欄。書いた字のうち、お手本と違うところに赤い下地を付ける（mode="hidden" では付けない）
// 書いた字は下の層に色付きで描き、入力欄の字は透明にしてカーソルだけを見せる
//
// 比べ方：空行のあるなしと、行頭の字下げの違いは見逃す（形式の違いで赤くしない）。
// 書いた空でない行を、お手本の空でない行に上から順に対応させ、行頭の空白を除いた中身どうしを1文字ずつ比べる。
// 1文字飛ばしてもその行の中だけが赤くなり、次の行からはまた正しく比べられる。

const leadingSpaces = (line) => (line.match(/^[ \t]*/) || [''])[0];
const isBlank = (s) => !s || !s.trim();
// 写経では { は自動で閉じない。} は何行も先に来るので、先に入れると行の対応がずれてお手本が乱れるため
const PAIRS = { '(': ')', '[': ']', '"': '"', "'": "'" };
const CLOSE_SET = new Set([')', ']', '}', '"', "'"]);

// 表示する行の並び。typed: 書いた行（まだ書いていない行は undefined）、target: 比べるお手本の行
export function alignLines(model, value) {
  const want = model.split('\n');
  const got = value.split('\n');
  const nextNonBlank = (k) => {
    let n = k;
    while (n < want.length && isBlank(want[n])) n += 1;
    return n;
  };
  const rows = [];
  let m = 0;
  got.forEach((line, i) => {
    const last = i === got.length - 1;
    if (isBlank(line)) {
      if (last) {
        // いま書いている空の行：お手本の次の行（空行ならそのまま空行）を薄く見せる
        rows.push({ typed: line, target: want[m] ?? '', idx: m });
        m += 1;
      } else {
        if (m < want.length && isBlank(want[m])) m += 1;
        rows.push({ typed: line, target: null });
      }
      return;
    }
    const t = nextNonBlank(m);
    rows.push({ typed: line, target: want[t] ?? '', idx: t });
    m = t + 1;
  });
  for (let k = m; k < want.length; k += 1) rows.push({ typed: undefined, target: want[k] });
  return rows;
}

// 書いた行の j 文字目がお手本と違うか（行頭の空白は数えない）
export function wrongAt(typed, target, j) {
  const indent = leadingSpaces(typed).length;
  if (j < indent || target == null) return target == null ? !/\s/.test(typed[j]) : false;
  const body = target.slice(leadingSpaces(target).length);
  return typed[j] !== body[j - indent];
}

// カーソルのすぐ後ろにある、自動で入れた閉じかっこ・閉じ引用符は、まだ「書いていない」ものとして比べない
const CLOSERS_ONLY = /^[)\]}"']+$/;
export function pendingFrom(value, caret) {
  if (caret == null) return null;
  const before = value.slice(0, caret).split('\n');
  const row = before.length - 1;
  const col = before[row].length;
  const rest = value.split('\n')[row]?.slice(col) || '';
  return CLOSERS_ONLY.test(rest) ? { row, col } : null;
}

export function compareLines(model, value, caret) {
  let ok = 0;
  let bad = 0;
  const pending = pendingFrom(value, caret);
  alignLines(model, value).forEach(({ typed, target }, i) => {
    if (typed === undefined) return;
    const end = pending && pending.row === i ? pending.col : typed.length;
    for (let j = leadingSpaces(typed).length; j < end; j += 1) {
      if (wrongAt(typed, target, j)) bad += 1;
      else ok += 1;
    }
  });
  const total = model.split('\n').reduce((n, l) => n + l.trim().length, 0) || 1;
  return { ok, bad, total, progress: Math.min(1, ok / total) };
}

// 空行・行頭と行末の空白の違いは無視して、完全に写せたかを見る
export const sameCode = (a, b) => {
  const norm = (s) =>
    s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n');
  return norm(a) === norm(b);
};

const TraceEditor = forwardRef(function TraceEditor(
  { model, value, onChange, mode = 'ghost', language = 'python', autoIndentFromModel = true, onFirstKey },
  ref
) {
  const want = useMemo(() => model.split('\n'), [model]);
  const got = value.split('\n');
  const rows = useMemo(() => alignLines(model, value), [model, value]);
  const lineCount = rows.length;
  const widthCh = Math.max(...want.map((l) => l.length), ...got.map((l) => l.length), 30) + 2;
  const showMarks = mode !== 'hidden';
  const areaRef = useRef(null);
  const pendingCaret = useRef(null);
  // 日本語などを変換している間は、確定前の字を入力欄そのものに見せる（色付きの層にはまだ入っていないため）
  const [composing, setComposing] = useState(false);
  const [caret, setCaret] = useState(null);
  useEffect(() => {
    const onSel = () => {
      if (document.activeElement === areaRef.current) setCaret(areaRef.current.selectionStart);
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);
  const pending = pendingFrom(value, caret);
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
  // 中身を書き換えたときは、描画の直後にカーソルを決めた位置に置き直す
  const emit = (next, at) => {
    pendingCaret.current = at;
    setCaret(at);
    onChange(next, at);
  };

  const handleChange = (e) => {
    const el = e.target;
    const next = el.value;
    const pos = el.selectionStart;
    if (composing) {
      onChange(next, pos);
      return;
    }
    const insertedOne = next.length === value.length + 1 && next.slice(0, pos - 1) + next.slice(pos) === value;
    const ch = insertedOne ? next[pos - 1] : '';

    if (ch === '\n') {
      const lineIndex = next.slice(0, pos).split('\n').length - 1;
      let indent;
      if (autoIndentFromModel && mode !== 'hidden') {
        // 次の行の字下げはお手本どおりに入れる（字下げの打ち込みで時間を使わない）
        const row = alignLines(model, next.slice(0, pos))[lineIndex];
        indent = leadingSpaces(row?.target || '');
      } else {
        const r = autoIndent({ value, start: pos - 1, end: pos - 1, language });
        indent = leadingSpaces(r.value.slice(0, r.caret).split('\n').pop());
      }
      emit(`${next.slice(0, pos)}${indent}${next.slice(pos)}`, pos + indent.length);
      return;
    }

    // 閉じる字を打ったとき、すぐ後ろに同じ字があれば、新しく足さずにその上を進む
    if (ch && CLOSE_SET.has(ch) && next[pos] === ch && (ch !== '"' && ch !== "'" ? true : value[pos - 2] !== '\\')) {
      // 中身は変わらないので、画面の字とカーソルだけをその場で戻す
      el.value = value;
      el.selectionStart = el.selectionEnd = pos;
      setCaret(pos);
      return;
    }

    // 開く字を打ったら、閉じる字も一緒に入れて、カーソルは間に置く
    if (ch && PAIRS[ch]) {
      const prev = next[pos - 2] || '';
      const quote = ch === '"' || ch === "'";
      if (!quote || !/[\w\\]/.test(prev)) {
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

    setCaret(pos);
    onChange(next, pos);
  };

  const handleKeyDown = (e) => {
    const el = e.target;
    onFirstKey?.();
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      emit(`${value.slice(0, start)}    ${value.slice(el.selectionEnd)}`, start + 4);
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
            className="trace-pre pointer-events-none absolute inset-0 whitespace-pre px-3 py-3 font-mono text-[13px] leading-6"
          >
            {rows.map(({ typed: line, target }, i) => {
              if (line === undefined) {
                return (
                  <div key={i} className="min-h-[1.5rem] text-[#ece3d6]/[0.18]">
                    {mode === 'ghost' ? target || ' ' : ' '}
                  </div>
                );
              }
              // 書いた行のあとに続けて、お手本の残りを薄く見せる（字下げの違いはそろえて見せる）
              const indent = leadingSpaces(line).length;
              const body = target == null ? '' : target.slice(leadingSpaces(target).length);
              const rest = line.trim()
                ? body.slice(line.length - indent)
                : (target || '').slice(Math.min(line.length, leadingSpaces(target || '').length));
              // 空の行も1行ぶんの高さを保つ（高さが0になると、下の行が上に詰まってずれる）
              return (
                <div key={i} className="min-h-[1.5rem]">
                  {Array.from(line).map((ch, j) => {
                    const wrong = !(pending && pending.row === i && j >= pending.col) && wrongAt(line, target, j);
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
                  {mode === 'ghost' && <span className="text-[#ece3d6]/[0.18]">{rest}</span>}
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
              onChange(e.currentTarget.value, e.currentTarget.selectionStart);
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
