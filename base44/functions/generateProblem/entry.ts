import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PROBLEM_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    statement: { type: 'string' },
    constraints: { type: 'string' },
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
    topics: { type: 'array', items: { type: 'string' } },
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
  required: ['title', 'statement', 'hints', 'test_cases', 'topics', 'templates'],
};

const DIFFICULTY_JA = {
  basic: '基礎（定石の型をそのまま使う）',
  intermediate: '中級（中で何が起きているかを意識する必要がある）',
  advanced: '上級（大型テックの面接水準。設計と説明も問われる）',
};

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      topic = '',
      difficulty = 'basic',
      language = 'cpp',
      weak_topics = [],
      source = 'ai',
      avoid_titles = [],
    } = body;

    const base44 = createClientFromRequest(req);

    const prompt = `あなたは技術面接の出題者です。C++とPythonの両方で解けるプログラミング問題を1問作ってください。

【希望トピック】${topic || '指定なし（基礎的で面接頻出のものを選ぶ）'}
【難易度】${DIFFICULTY_JA[difficulty] || DIFFICULTY_JA.basic}
【主に使う言語】${language === 'python' ? 'Python' : 'C++'}
【この人が苦手なトピック】${weak_topics.length ? weak_topics.join('、') : '不明'}
【避けたい既出タイトル】${avoid_titles.length ? avoid_titles.slice(0, 20).join('、') : 'なし'}

作り方のルール:
- 問題文は日本語で、入出力の仕様がはっきり分かるように書く。関数のシグネチャ（引数と戻り値）も問題文に明記する。
- hints は3段階。1つ目は考え方の方向づけだけ、2つ目は使う道具、3つ目は具体的な手順。答えそのものは書かない。
- test_cases は境界値を含めて3〜4個。input と expected は簡潔な文字列で書く。
- templates には cpp と python の両方のひな形（関数シグネチャと空の本体）を入れる。language は "cpp" と "python"。
- explanation などの解説文はまだ書かない。
- 難しい学術用語は避け、基本情報技術者試験レベルの言葉で書く。`;

    const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: PROBLEM_SCHEMA,
      model: 'gemini_3_1_pro',
    });

    const templates = Array.isArray(generated.templates) ? generated.templates : [];

    const problem = await base44.entities.Problem.create({
      title: generated.title,
      statement: generated.statement,
      constraints: generated.constraints || '',
      difficulty,
      stage: difficulty === 'advanced' ? 3 : difficulty === 'intermediate' ? 2 : 1,
      topics: generated.topics || (topic ? [topic] : []),
      templates,
      hints: generated.hints || [],
      test_cases: generated.test_cases || [],
      expected_complexity: generated.expected_complexity || '',
      time_limit_minutes: Number(generated.time_limit_minutes) || (difficulty === 'advanced' ? 40 : difficulty === 'intermediate' ? 25 : 15),
      source: source === 'interview' ? 'interview' : 'ai',
      order_index: 900,
    });

    return Response.json({ problem });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}