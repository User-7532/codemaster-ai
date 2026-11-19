import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tokenClasses } from '@/lib/highlight';
import { linesAround, registerCodeAsk } from '@/lib/selection-ask';
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
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
// 閉じかっこだけの行（} や }; など）
const CLOSER_LINE = /^\s*[)\]}]+;?\s*$/;
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

// 自動で入れた閉じかっこは、まだ「書いていない」ものとして比べない。
// - カーソルと同じ行で、カーソルより後ろにある閉じかっこ・閉じ引用符（col から先）
// - カーソルより下にあって、文書の終わりまで閉じかっこだけの行が続く部分（tail から先の行）
const CLOSERS_ONLY = /^[)\]}"']+$/;
export function pendingFrom(value, caret) {
  const lines = value.split('\n');
  if (caret == null) return { row: -1, col: 0, tail: lines.length };
  const before = value.slice(0, caret).split('\n');
  const row = before.length - 1;
  const rest = (lines[row] || '').slice(before[row].length);
  let tail = lines.length;
  for (let k = lines.length - 1; k > row; k -= 1) {
    if (CLOSER_LINE.test(lines[k]) || !lines[k].trim()) tail = k;
    else break;
  }
  // 末尾の空行だけなら、まだ書いていない閉じかっこはない
  if (lines.slice(tail).every((l) => !l.trim())) tail = lines.length;
  return { row, col: CLOSERS_ONLY.test(rest) ? before[row].length : (lines[row] || '').length, tail };
}

// 比べる部分（カーソルより下の、自動で入れた閉じかっこの行を除いたもの）
const headOf = (value, pending) => value.split('\n').slice(0, pending.tail).join('\n');

export function compareLines(model, value, caret) {
  let ok = 0;
  let bad = 0;
  const pending = pendingFrom(value, caret);
  alignLines(model, headOf(value, pending)).forEach(({ typed, target }, i) => {
    if (typed === undefined) return;
    const end = pending.row === i ? Math.min(pending.col, typed.length) : typed.length;
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
  const widthCh = Math.max(...want.map((l) => l.length), ...got.map((l) => l.length), 30) + 2;
  const showMarks = mode !== 'hidden';
  const areaRef = useRef(null);
  const pendingCaret = useRef(null);
  // なぞり書きで閉じかっこの行を自動で入れたとき、その行の先頭の位置
  const pendingAuto = useRef(null);
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
  // 表示する行：書いた行（比べる部分）→ 自動で入れた閉じかっこの行 → お手本の残り
  const rows = useMemo(() => {
    const aligned = alignLines(model, headOf(value, pending));
    const typedRows = aligned.filter((r) => r.typed !== undefined);
    const restRows = aligned.filter((r) => r.typed === undefined);
    const tailRows = value
      .split('\n')
      .slice(pending.tail)
      .map((line) => ({ typed: line, target: null, pending: true }));
    return [...typedRows, ...tailRows, ...restRows];
  }, [model, value, pending.tail]); // eslint-disable-line react-hooks/exhaustive-deps
  const lineCount = rows.length;
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

  // 入力欄で選んだところを質問するとき、AIに渡す周りの情報（書いたコードとお手本の同じあたり）
  const askRef = useRef(null);
  askRef.current = (start, end) => {
    const typed = linesAround(value, start, end);
    const row = value.slice(0, start).split('\n').length - 1;
    const last = value.slice(0, end).split('\n').length - 1;
    const targets = rows
      .slice(Math.max(0, row - 2), last + 3)
      .map((r) => r.target)
      .filter((t) => t != null);
    return `【写経中。学習者が書いたコード（> が選んだ行）】\n${typed}\n【お手本の同じあたり】\n${targets.join('\n')}\n（赤い印はお手本と違う字。質問が「なぜだめか」なら、お手本との違いと、その違いで何が変わるかを答える）`;
  };
  const setRefs = (el) => {
    areaRef.current = el;
    registerCodeAsk(el, (a, b) => askRef.current?.(a, b));
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
    // 直前の打鍵で閉じかっこの行を自動で入れたか（その直後の1打鍵だけ使う）
    const autoLine = pendingAuto.current;
    pendingAuto.current = null;
    if (composing) {
      onChange(next, pos);
      return;
    }
    const insertedOne = next.length === value.length + 1 && next.slice(0, pos - 1) + next.slice(pos) === value;
    const ch = insertedOne ? next[pos - 1] : '';

    if (ch === '\n') {
      const lineIndex = next.slice(0, pos).split('\n').length - 1;
      // なぞり書きで、まだ何も書いていない行で改行しても、お手本にない空行は作らない
      // （空行を足すたびに薄いお手本が1行ずつ下へ逃げていくため）
      if (mode === 'ghost') {
        const prevLine = next.slice(0, pos - 1).split('\n').pop();
        if (!prevLine.trim()) {
          const here = alignLines(model, value.slice(0, pos - 1))[lineIndex - 1];
          if (here && ((here.target && here.target.trim()) || (here.idx ?? 0) >= want.length)) {
            el.value = value;
            el.selectionStart = el.selectionEnd = pos - 1;
            return;
          }
        }
      }
      let indent;
      if (autoIndentFromModel && mode !== 'hidden') {
        // 次の行の字下げはお手本どおりに入れる（字下げの打ち込みで時間を使わない）
        const row = alignLines(model, next.slice(0, pos))[lineIndex];
        indent = leadingSpaces(row?.target || '');
      } else {
        const r = autoIndent({ value, start: pos - 1, end: pos - 1, language });
        indent = leadingSpaces(r.value.slice(0, r.caret).split('\n').pop());
      }
      // なぞり書きでは、次の行がお手本で閉じかっこだけの行（} など）なら、その行を自動で入れる
      // （なぞり書きでは { を自動で閉じない。先に } を入れると、薄いお手本と行が重なってしまうため）
      if (mode === 'ghost') {
        const row = alignLines(model, next.slice(0, pos))[lineIndex];
        const restOfLine = next.slice(pos).split('\n')[0];
        if (row?.target && CLOSER_LINE.test(row.target) && !restOfLine.trim()) {
          pendingAuto.current = pos;
          emit(`${next.slice(0, pos)}${row.target}${next.slice(pos)}`, pos + row.target.length);
          return;
        }
      }
      // { と } の間で改行したら、} は次の行に送る（見ながら・隠して）
      const opener = next[pos - 2];
      if (mode !== 'ghost' && PAIRS[opener] && opener !== '"' && opener !== "'" && next[pos] === PAIRS[opener]) {
        const base = leadingSpaces(next.slice(0, pos - 1).split('\n').pop());
        const inner = indent.length > base.length ? indent : `${base}    `;
        emit(`${next.slice(0, pos)}${inner}\n${base}${next.slice(pos)}`, pos + inner.length);
        return;
      }
      emit(`${next.slice(0, pos)}${indent}${next.slice(pos)}`, pos + indent.length);
      return;
    }

    if (ch === '}' || ch === ')' || ch === ']') {
      const lineStart = next.lastIndexOf('\n', pos - 1) + 1;
      const lineEnd = next.indexOf('\n', pos) === -1 ? next.length : next.indexOf('\n', pos);
      const before = next.slice(lineStart, pos - 1);
      const after = next.slice(pos, lineEnd);
      // 自分で } を打った行のすぐ下に、自動で入れた } の行があれば、そちらを使う（} が二重にならないように）
      if (!before.trim() && !after.trim() && lineEnd < next.length) {
        const nextLineEnd = next.indexOf('\n', lineEnd + 1) === -1 ? next.length : next.indexOf('\n', lineEnd + 1);
        const nextLine = next.slice(lineEnd + 1, nextLineEnd);
        if (CLOSER_LINE.test(nextLine) && nextLine.trim()[0] === ch) {
          const merged = next.slice(0, lineStart) + next.slice(lineEnd + 1);
          emit(merged, lineStart + leadingSpaces(nextLine).length + 1);
          return;
        }
      }
      // 自動で入れた閉じかっこの行のすぐ後ろで同じ字を打ったら、足さない（なぞり書きで } を自動で入れたあとの癖の打鍵）
      if (!after.trim() && CLOSER_LINE.test(before) && before.trim().endsWith(ch) && autoLine === lineStart) {
        el.value = value;
        el.selectionStart = el.selectionEnd = pos - 1;
        return;
      }
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
    if (ch && PAIRS[ch] && !(ch === '{' && mode === 'ghost')) {
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
            {rows.map(({ typed: line, target, pending: auto }, i) => {
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
                    const wrong = !auto && !(pending.row === i && j >= pending.col) && wrongAt(line, target, j);
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
            data-ask-code
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
