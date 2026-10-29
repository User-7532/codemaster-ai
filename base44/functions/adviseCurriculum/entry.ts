import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DIFFS = ['basic', 'intermediate', 'advanced'];
const STAGE_OF = { basic: 1, intermediate: 2, advanced: 3 };

const SCHEMA = {
  type: 'object',
  properties: {
    advice: { type: 'string' },
    difficulty_changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          problem_id: { type: 'string' },
          difficulty: { type: 'string', enum: DIFFS },
          reason: { type: 'string' },
        },
        required: ['problem_id', 'difficulty'],
      },
    },
    add_problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          statement: { type: 'string' },
          constraints: { type: 'string' },
          difficulty: { type: 'string', enum: DIFFS },
          topics: { type: 'array', items: { type: 'string' } },
          hints: { type: 'array', items: { type: 'string' } },
          test_cases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                input: { type: 'string' },
                expected: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['input', 'expected'],
            },
          },
          expected_complexity: { type: 'string' },
          time_limit_minutes: { type: 'number' },
        },
        required: ['title', 'statement', 'difficulty', 'topics', 'hints', 'test_cases'],
      },
    },
  },
  required: ['advice', 'difficulty_changes', 'add_problems'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const request = String(body.request || '').trim().slice(0, 800);
    if (!request) return Response.json({ error: '相談内容を入力してください' }, { status: 400 });

    const [{ items: problems }, { items: subs }] = await Promise.all([
      base44.entities.Problem.filter({ source: 'curriculum' }, { sort: 'order_index', limit: 200 }),
      base44.entities.Submission.list({ sort: '-created_date', limit: 200 }),
    ]);

    const state = {};
    subs.forEach((s) => {
      if (!state[s.problem_id]) state[s.problem_id] = s.verdict;
    });

    const counts = { basic: 0, intermediate: 0, advanced: 0 };
    const topicSet = new Set();
    problems.forEach((p) => {
      if (counts[p.difficulty] !== undefined) counts[p.difficulty] += 1;
      (p.topics || []).forEach((t) => topicSet.add(t));
    });

    const lines = problems
      .map((p) => `- id:${p.id} / ${p.title} / ${p.difficulty} / STEP${p.stage || 1} / ${(p.topics || []).join('・') || 'トピック未設定'} / ${state[p.id] === 'correct' ? '正解済み' : state[p.id] ? '未正解' : '未着手'}`)
      .join('\n');

    const prompt = `あなたは技術面接対策の学習コーチです。この人のカリキュラム（問題リスト）についての相談に答えます。

【今のカリキュラム】
問題数: ${problems.length}（基礎 ${counts.basic} / 中級 ${counts.intermediate} / 上級 ${counts.advanced}）
扱っているトピック: ${[...topicSet].slice(0, 40).join('、') || 'なし'}
${lines || '（まだ問題がありません）'}

【この人の相談】${request}

やること:
- advice: 相談への答えを、やさしい日本語で2〜4文。何が足りない/偏っているかを具体的に指摘し、どう変えたかを述べる。
- difficulty_changes: 今ある問題のうち、明らかに難易度がずれているものだけ最大3件。problem_id は上の一覧の id をそのまま使う。ずれがないなら空配列。むやみに変えない。
- add_problems: 足りないジャンルや段階を補う新しい問題を0〜2問。問題文は日本語で、入出力と関数シグネチャを明記。hints は3段階（方向づけ→使う道具→手順、答えは書かない）。test_cases は境界値を含め3〜4個。C++とPythonの両方で解ける内容にする。学術的な難しい言葉は避け、基本情報技術者試験レベルの言葉で書く。

ルール: 全体の問題数は増やしすぎない。相談が「易しすぎる」なら上級を足す、「難しすぎる」なら基礎を足す、というように相談に素直に従う。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
    });

    const byId = new Map(problems.map((p) => [p.id, p]));

    const updates = [];
    const updated = [];
    (Array.isArray(out.difficulty_changes) ? out.difficulty_changes : []).slice(0, 3).forEach((c) => {
      const target = byId.get(c.problem_id);
      if (!target || !DIFFS.includes(c.difficulty)) return;
      if (target.difficulty === c.difficulty) return;
      updates.push({ id: target.id, difficulty: c.difficulty, stage: STAGE_OF[c.difficulty] });
      updated.push({ title: target.title, from: target.difficulty, to: c.difficulty });
    });

    if (updates.length) await base44.entities.Problem.bulkUpdate(updates);

    const maxOrder = problems.reduce((m, p) => Math.max(m, Number(p.order_index) || 0), 0);
    const created = [];
    const fresh = (Array.isArray(out.add_problems) ? out.add_problems : []).slice(0, 2).map((p, i) => {
      const difficulty = DIFFS.includes(p.difficulty) ? p.difficulty : 'basic';
      created.push({ title: p.title, difficulty });
      return {
        title: String(p.title || '新しい問題').slice(0, 120),
        statement: p.statement || '',
        constraints: p.constraints || '',
        difficulty,
        stage: STAGE_OF[difficulty],
        topics: Array.isArray(p.topics) ? p.topics.slice(0, 6) : [],
        hints: Array.isArray(p.hints) ? p.hints.slice(0, 3) : [],
        test_cases: Array.isArray(p.test_cases) ? p.test_cases.slice(0, 5) : [],
        expected_complexity: p.expected_complexity || '',
        time_limit_minutes: Number(p.time_limit_minutes) || (difficulty === 'advanced' ? 40 : difficulty === 'intermediate' ? 25 : 15),
        source: 'curriculum',
        order_index: maxOrder + 1 + i,
      };
    });

    if (fresh.length) await base44.entities.Problem.bulkCreate(fresh);

    return Response.json({ advice: out.advice || '', updated, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}