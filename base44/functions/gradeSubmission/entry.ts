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

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problem_id, language = 'cpp', mode = 'practice', duration_seconds = 0, code = '' } = body;

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

    const cases = (problem.test_cases || [])
      .map((t, i) => `${i + 1}. 入力: ${t.input || '-'} / 期待する出力: ${t.expected || '-'}${t.note ? ` (${t.note})` : ''}`)
      .join('\n') || '(指定なし。問題文から妥当なケースを3つ考えて検証)';

    const interviewBlock =
      mode === 'interview'
        ? 'interview_feedback には面接官の立場で「考え方の筋道」「説明の仕方」「時間配分」を200字程度で書く。'
        : 'interview_feedback は空文字にする。';

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
- 全ケース通過なら correct、考え方は合っているが一部ケースで落ちるなら partial、的根本的に誤りなら wrong。
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

    const submission = await base44.entities.Submission.create({
      problem_id: problem.id,
      problem_title: problem.title,
      language,
      code,
      verdict: result.verdict,
      score: Math.max(0, Math.min(100, Math.round(Number(result.score) || 0))),
      time_complexity: result.time_complexity || '',
      space_complexity: result.space_complexity || '',
      test_results: result.test_results || [],
      issues: result.issues || [],
      explanation: result.explanation || '',
      interview_feedback: result.interview_feedback || '',
      topics: problem.topics || [],
      mode,
      duration_seconds: Number(duration_seconds) || 0,
    });

    return Response.json({ result, submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}