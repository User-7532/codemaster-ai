import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_CODE = 20000;

// 言語 → Wandbox のコンパイラ名。対応言語を増やすときは、まずここに1行足す。
// （後々 HTML/XML/SQL など命令型以外を足すときは、別の実行方法が要るものもあるので、その言語だけ下の runOne を分岐する）
const COMPILERS = {
  c: 'gcc-13.2.0-c',
  cpp: 'gcc-13.2.0',
  python: 'cpython-3.13.18',
};

// Wandbox で1回コンパイル＆実行する（標準入力つき）。実際にコードが動く。
async function runOne(compiler, code, stdin) {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler, code, stdin: stdin == null ? '' : String(stdin) }),
  });
  if (!res.ok) throw new Error(`Wandbox ${res.status}`);
  return await res.json();
}

// 出力の比較用の正規化：改行コード・行末の空白・末尾の空行の違いは無視する。
const normOut = (s) =>
  String(s ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { language = 'cpp', code = '', cases = [] } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (typeof code !== 'string' || !code.trim()) return Response.json({ error: 'コードが空です' }, { status: 400 });
    if (code.length > MAX_CODE) return Response.json({ error: 'コードが長すぎます' }, { status: 400 });

    const compiler = COMPILERS[language];
    if (!compiler) return Response.json({ error: `まだ実行に対応していない言語です: ${language}` }, { status: 400 });

    const list = (Array.isArray(cases) && cases.length ? cases : [{ input: '', expected: null }]).slice(0, 20);
    const results = [];
    for (const c of list) {
      let r;
      try {
        r = await runOne(compiler, code, c?.input ?? '');
      } catch (e) {
        results.push({
          input: c?.input ?? '',
          expected: c?.expected ?? null,
          stdout: '',
          stderr: '',
          compile_error: '',
          error: String((e && e.message) || e),
          passed: null,
        });
        continue;
      }
      const stdout = r.program_output ?? '';
      const compileErr = String(r.compiler_error || '').trim();
      const hasExpected = c?.expected != null && String(c.expected) !== '';
      const passed = !hasExpected ? null : compileErr ? false : normOut(stdout) === normOut(c.expected);
      results.push({
        input: c?.input ?? '',
        expected: c?.expected ?? null,
        stdout,
        stderr: String(r.program_error || '').trim(),
        compile_error: compileErr,
        signal: r.signal || '',
        passed,
      });
    }

    const graded = results.filter((r) => r.passed !== null);
    const passed = graded.filter((r) => r.passed).length;
    const total = graded.length;
    return Response.json({ results, passed, total, all_passed: total > 0 && passed === total, compiler });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
