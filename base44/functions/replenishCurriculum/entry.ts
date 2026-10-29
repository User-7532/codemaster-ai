import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DIFFS = ['basic', 'intermediate', 'advanced'];
const DIFF_JA = {
  basic: '基礎（定石の型をそのまま使う）',
  intermediate: '中級（中で何が起きているかを意識する）',
  advanced: '上級（大型テックの面接水準。設計と説明も問われる）',
};
const STAGE_OF = { basic: 1, intermediate: 2, advanced: 3 };
const MIN_UNSOLVED = 6;
const BATCH = 3;

const SCHEMA = {
  type: 'object',
  properties: {
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          statement: { type: 'string' },
          constraints: { type: 'string' },
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
          templates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                language: { type: 'string' },
                code: { type: 'string' },
              },
              required: ['language', 'code'],
            },
          },
        },
        required: ['title', 'statement', 'topics', 'hints', 'test_cases', 'templates'],
      },
    },
  },
  required: ['problems'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ items: problems }, { items: subs }, { items: attempts }] = await Promise.all([
      base44.entities.Problem.filter({ source: 'curriculum' }, { sort: 'order_index', limit: 200 }),
      base44.entities.Submission.list({ sort: '-created_date', limit: 200 }),
      base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 200 }),
    ]);

    const solvedIds = new Set(subs.filter((s) => s.verdict === 'correct').map((s) => s.problem_id));
    const unsolved = problems.filter((p) => !solvedIds.has(p.id));

    if (unsolved.length >= MIN_UNSOLVED) {
      return Response.json({ added: [], unsolved_before: unsolved.length, reason: 'enough' });
    }

    const need = Math.min(BATCH, MIN_UNSOLVED - unsolved.length);

    const unsolvedByDiff = { basic: 0, intermediate: 0, advanced: 0 };
    const solvedByDiff = { basic: 0, intermediate: 0, advanced: 0 };
    problems.forEach((p) => {
      if (!DIFFS.includes(p.difficulty)) return;
      if (solvedIds.has(p.id)) solvedByDiff[p.difficulty] += 1;
      else unsolvedByDiff[p.difficulty] += 1;
    });

    // 段階は「今のレベルで無理なく進める範囲」に限定する
    const order = ['basic'];
    if (solvedByDiff.basic >= 2) order.push('intermediate');
    if (solvedByDiff.intermediate >= 2) order.push('advanced');
    const sorted = [...order].sort((a, b) => unsolvedByDiff[a] - unsolvedByDiff[b]);
    const slots = Array.from({ length: need }, (_, i) => sorted[i % sorted.length]);

    // 苦手なトピック（誤答したコード問題＋間違えた知識カード）
    const byId = new Map(problems.map((p) => [p.id, p]));
    const topicScore = {};
    subs.forEach((s) => {
      if (s.verdict === 'correct') return;
      const p = byId.get(s.problem_id);
      (p?.topics || s.topics || []).forEach((t) => {
        topicScore[t] = (topicScore[t] || 0) + 1;
      });
    });
    attempts.forEach((a) => {
      if (a.correct || !a.topic) return;
      topicScore[a.topic] = (topicScore[a.topic] || 0) + 1;
    });
    const weakTopics = Object.entries(topicScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);

    const spec = slots.map((d, i) => `${i + 1}問目: ${DIFF_JA[d]}`).join('\n');

    const prompt = `あなたは技術面接の出題者です。この人のカリキュラムが手薄になってきたので、続けられるように新しい問題を作ってください。

【この人が苦手なトピック】${weakTopics.length ? weakTopics.join('、') : 'まだ記録がないので、面接でよく聞かれる王道のものを選ぶ'}
【既に出題済みのタイトル（同じ内容・似た内容は避ける）】${problems.slice(0, 40).map((p) => p.title).join('、') || 'なし'}
【作る問題と難易度】
${spec}

作り方のルール:
- 問題文は日本語で、入出力の仕様がはっきり分かるように書く。関数のシグネチャ（引数と戻り値）も問題文に明記する。
- 苦手なトピックがあれば、その考え方を使う問題を優先して混ぜる。
- hints は3段階。1つ目は考え方の方向づけだけ、2つ目は使う道具、3つ目は具体的な手順。答えそのものは書かない。
- test_cases は境界値を含めて3〜4個。input と expected は簡潔な文字列で書く。
- templates には cpp・c・python の3つのひな形（関数シグネチャと空の本体）を入れる。language は "cpp"・"c"・"python"。
- c のひな形はC言語だけで書く。C++専用の機能（vector、string、cout、<bits/stdc++.h>）は使わず、<stdio.h>・<stdlib.h>・<string.h> と malloc/free で書く。
- 問題文・制約・ヒントは、正確な技術用語を使った日本語で書く。標準的な用語（配列、連結リスト、スタック、ハッシュマップ、ヒープ、二分探索、動的計画法など）をそのまま使う。比喩や曖昧な言い換えは禁止。仕様は誰が読んでも同じ意味に取れるように厳密に書く。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
    });

    const maxOrder = problems.reduce((m, p) => Math.max(m, Number(p.order_index) || 0), 0);
    const existingTitles = new Set(problems.map((p) => String(p.title || '').trim()));
    const added = [];
    const fresh = [];

    (Array.isArray(out.problems) ? out.problems : []).slice(0, need).forEach((p, i) => {
      const title = String(p.title || '').trim().slice(0, 120);
      if (!title || existingTitles.has(title)) return;
      existingTitles.add(title);
      const difficulty = slots[i] || 'basic';
      added.push({ title, difficulty });
      fresh.push({
        title,
        statement: p.statement || '',
        constraints: p.constraints || '',
        difficulty,
        stage: STAGE_OF[difficulty],
        topics: Array.isArray(p.topics) ? p.topics.slice(0, 6) : [],
        hints: Array.isArray(p.hints) ? p.hints.slice(0, 3) : [],
        test_cases: Array.isArray(p.test_cases) ? p.test_cases.slice(0, 5) : [],
        expected_complexity: p.expected_complexity || '',
        time_limit_minutes:
          Number(p.time_limit_minutes) || (difficulty === 'advanced' ? 40 : difficulty === 'intermediate' ? 25 : 15),
        source: 'curriculum',
        order_index: maxOrder + 1 + i,
      });
    });

    if (fresh.length) await base44.entities.Problem.bulkCreate(fresh);

    return Response.json({ added, unsolved_before: unsolved.length, weak_topics: weakTopics });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}