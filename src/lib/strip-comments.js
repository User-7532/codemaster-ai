// お手本のコードからコメントを取り除く（写経でコメントまで写させないため）。
// 文字列や文字定数の中の // や # はコメントとして扱わない。
// 返り値: { code, lineMap }  lineMap[元の行番号(1始まり)] = 新しい行番号（消えた行は null）
export function stripComments(source, language) {
  const text = String(source || '');
  const python = language === 'python';
  let out = '';
  let i = 0;
  let inBlock = false;
  while (i < text.length) {
    const ch = text[i];
    const two = text.slice(i, i + 2);
    if (inBlock) {
      if (two === '*/') {
        inBlock = false;
        i += 2;
      } else {
        if (ch === '\n') out += '\n';
        i += 1;
      }
      continue;
    }
    // 文字列・文字定数（Python の三重引用符も）
    if (ch === '"' || ch === "'") {
      const triple = python && text.slice(i, i + 3) === ch.repeat(3) ? ch.repeat(3) : '';
      const quote = triple || ch;
      let j = i + quote.length;
      while (j < text.length) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text.slice(j, j + quote.length) === quote) {
          j += quote.length;
          break;
        }
        if (!triple && text[j] === '\n') break;
        j += 1;
      }
      out += text.slice(i, j);
      i = j;
      continue;
    }
    if (!python && two === '/*') {
      inBlock = true;
      i += 2;
      continue;
    }
    if ((!python && two === '//') || (python && ch === '#')) {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }

  const before = text.split('\n');
  const after = out.split('\n');
  const lines = [];
  const lineMap = {};
  after.forEach((line, k) => {
    const trimmed = line.replace(/\s+$/, '');
    // コメントだけだった行は消す（もともと空行だった行は残す）
    if (!trimmed.trim() && before[k]?.trim()) {
      lineMap[k + 1] = null;
      return;
    }
    lines.push(trimmed);
    lineMap[k + 1] = lines.length;
  });
  // 空行が続きすぎないように、2行以上の空行は1行にする
  const compact = [];
  const finalMap = {};
  const shift = {};
  lines.forEach((l, k) => {
    if (!l.trim() && compact.length && !compact[compact.length - 1].trim()) {
      shift[k + 1] = null;
      return;
    }
    compact.push(l);
    shift[k + 1] = compact.length;
  });
  Object.entries(lineMap).forEach(([orig, mid]) => {
    finalMap[orig] = mid == null ? null : shift[mid] ?? null;
  });
  const code = compact.join('\n').replace(/^\n+|\n+$/g, '');
  return { code, lineMap: finalMap };
}

export const hasComments = (source, language) => stripComments(source, language).code !== String(source || '').replace(/^\n+|\n+$/g, '');

// 写経のデータを、コメントなしのお手本に合わせて直す（行ごとの解説の行番号も付け替える。問題文は作り直す）
export function stripDrill(drill) {
  const { code, lineMap } = stripComments(drill.code, drill.language);
  const lineCount = code.split('\n').length;
  const notes = [];
  (drill.line_notes || []).forEach((n) => {
    let line = lineMap[n.line];
    // コメントだけの行に付いていた解説は、すぐ下のコードの行に付け替える
    for (let k = n.line + 1; line == null && k <= n.line + 3; k += 1) line = lineMap[k];
    if (line && line <= lineCount && !notes.some((x) => x.line === line)) notes.push({ ...n, line });
  });
  return { code, line_notes: notes, spec: null };
}
