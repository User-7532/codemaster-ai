import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_CODE = 20000;

const LANG_LABEL = { python: 'Python', c: 'C', cpp: 'C++' };
const LANG_FENCE = { python: 'python', c: 'c', cpp: 'cpp' };

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['correct', 'partial', 'wrong'] },
    score: { type: 'number' },
    test_results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          case: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['case', 'passed', 'reason'],
      },
    },
    time_complexity: { type: 'string' },
    space_complexity: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    explanation: { type: 'string' },
    interview_feedback: { type: 'string' },
  },
  required: ['verdict', 'score', 'test_results', 'time_complexity', 'issues', 'explanation'],
};

const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    time_complexity: { type: 'string' },
    space_complexity: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    explanation: { type: 'string' },
    interview_feedback: { type: 'string' },
  },
  required: ['time_complexity', 'issues', 'explanation'],
};

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problem_id, language = 'cpp', mode = 'practice', duration_seconds = 0, code = '', execution = null } = body;

    if (!problem_id) return Response.json({ error: 'problem_id is required' }, { status: 400 });
    if (typeof code !== 'string' || !code.trim()) return Response.json({ error: 'コードが空です' }, { status: 400 });
    if (code.length > MAX_CODE) return Response.json({ error: 'コードが長すぎます' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const problem = await base44.entities.Problem.get(problem_id).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!problem) return Response.json({ error: 'Problem not found' }, { status: 404 });

    const interviewBlock =
      mode === 'interview'
        ? 'interview_feedback には面接官の立場で「考え方の筋道」「説明の仕方」「時間配分」を200字程度で書く。'
        : 'interview_feedback は空文字にする。';

    let out;

    if (execution && Array.isArray(execution.results)) {
      const results = execution.results;
      const graded = results.filter((r) => r.passed === true || r.passed === false);
      const passed = typeof execution.passed === 'number' ? execution.passed : graded.filter((r) => r.passed).length;
      const total = typeof execution.total === 'number' ? execution.total : graded.length;
      const verdict = total > 0 && passed === total ? 'correct' : passed > 0 ? 'partial' : 'wrong';
      const score = total > 0 ? Math.round((passed / total) * 100) : 0;
      const test_results = results.map((r) => ({
        case: `入力 ${String(r.input ?? '').slice(0, 40) || '(なし)'}`,
        passed: r.passed === true,
        reason: r.compile_error
          ? 'コンパイルエラー'
          : r.passed === false
            ? `出力が違います（出力: ${String(r.stdout ?? '').replace(/\n/g, '⏎').slice(0, 40)}）`
            : r.passed === true
              ? '通過'
              : '期待出力なし',
      }));
      const runSummary = results
        .map(
          (r, i) =>
            `#${i + 1} 入力:${String(r.input ?? '').slice(0, 60)} 期待:${String(r.expected ?? '').slice(0, 60)} 実際:${String(r.stdout ?? '').slice(0, 60)} ${r.compile_error ? `[コンパイルエラー:${String(r.compile_error).slice(0, 140)}]` : ''} => ${r.passed ? 'OK' : 'NG'}`
        )
        .join('\n');

      const fbPrompt = `次のコードは実際に実行済みで、テスト結果は下のとおりです（${passed}/${total} 通過）。合否は確定しているので再判定はせず、講評だけ返してください。

【問題】${problem.title}
${problem.statement}
【言語】${LANG_LABEL[language] || 'C++'}
【想定の計算量】${problem.expected_complexity || '指定なし'}

【実行結果】
${runSummary}

【コード】
\`\`\`${LANG_FENCE[language] || 'cpp'}
${code}
\`\`\`

- time_complexity / space_complexity は O(...) 形式で、このコードの見積もりを書く。
- issues は直すと良い点を最大4つ、短い日本語で。コンパイルエラーがあれば、その原因を1つ目に書く。
- explanation は200字程度の日本語で、何が良く何が足りないかを書く。専門用語は正確な標準用語で、比喩や曖昧な言い換えはしない。
- ${interviewBlock}`;

      const fb = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: fbPrompt,
        response_json_schema: FEEDBACK_SCHEMA,
      });

      out = {
        verdict,
        score,
        test_results,
        time_complexity: fb.time_complexity || '',
        space_complexity: fb.space_complexity || '',
        issues: fb.issues || [],
        explanation: fb.explanation || '',
        interview_feedback: fb.interview_feedback || '',
      };
    } else {
      const cases =
        (problem.test_cases || [])
          .map((t, i) => `${i + 1}. 入力: ${t.input || '-'} / 期待する出力: ${t.expected || '-'}${t.note ? ` (${t.note})` : ''}`)
          .join('\n') || '(指定なし。問題文から妥当なケースを3つ考えて検証)';

      const prompt = `あなたは技術面接の採点官です。次の提出コードを読み、実際には実行せず、頭の中でテストケースを1件ずつ追いかけて判定してください。

【問題】
${problem.title}
${problem.statement}

【制約】
${problem.constraints || '特になし'}

【検証するテストケース】
${cases}

【言語】${LANG_LABEL[language] || 'C++'}
【想定の計算量】${problem.expected_complexity || '指定なし'}

【提出コード】
\`\`\`${LANG_FENCE[language] || 'cpp'}
${code}
\`\`\`

判定のルール:
- コードは実行しない。上のテストケースを順に手で追い、各ケースの出力を予想して合否を出す。
- コンパイルエラーや未定義動作になりそうな箇所があれば、その時点で wrong とし、理由を書く。
- 全ケース通過なら correct、考え方は合っているが一部ケースで落ちるなら partial、根本的に誤りなら wrong。
- score は 0〜100 の整数。
- time_complexity と space_complexity は O(...) の形で書く。
- issues は「直したほうがいい点」を最大4つ、短い日本語で。
- 言語が C のときは、C++専用の機能（std::vector、string、cout、<bits/stdc++.h>）が混ざっていればコンパイルエラーとして扱う。malloc した領域の free 忘れや、配列の範囲外アクセスも指摘する。
- explanation は 250字程度の日本語。専門用語は正確な標準用語で書き、比喩や曖昧な言い換え（「中身」「入れ物」など）はしない。難しい言い回しだけを避ける。
- ${interviewBlock}`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: GRADE_SCHEMA,
      });

      out = {
        verdict: result.verdict,
        score: Math.max(0, Math.min(100, Math.round(Number(result.score) || 0))),
        test_results: result.test_results || [],
        time_complexity: result.time_complexity || '',
        space_complexity: result.space_complexity || '',
        issues: result.issues || [],
        explanation: result.explanation || '',
        interview_feedback: result.interview_feedback || '',
      };
    }

    const submission = await base44.entities.Submission.create({
      problem_id: problem.id,
      problem_title: problem.title,
      language,
      code,
      verdict: out.verdict,
      score: out.score,
      time_complexity: out.time_complexity,
      space_complexity: out.space_complexity,
      test_results: out.test_results,
      issues: out.issues,
      explanation: out.explanation,
      interview_feedback: out.interview_feedback,
      topics: problem.topics || [],
      mode,
      duration_seconds: Number(duration_seconds) || 0,
    });

    return Response.json({ result: out, submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
