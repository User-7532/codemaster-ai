import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// 写経の場を作る。身につけたいことから、短いお手本コード・行ごとの解説・写経のあとに解く練習問題をまとめて用意する
const LANG = { python: 'Python', c: 'C', cpp: 'C++' };

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    code: { type: 'string' },
    line_notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { line: { type: 'number' }, note: { type: 'string' } },
        required: ['line', 'note'],
      },
    },
    key_points: { type: 'array', items: { type: 'string' } },
    follow_up: {
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
            properties: { input: { type: 'string' }, expected: { type: 'string' }, note: { type: 'string' } },
            required: ['input', 'expected'],
          },
        },
        template: { type: 'string' },
        topics: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'statement', 'hints', 'test_cases', 'template', 'topics'],
    },
  },
  required: ['title', 'summary', 'code', 'line_notes', 'key_points', 'follow_up'],
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const goal = String(body.goal || '').trim().slice(0, 600);
    const language = LANG[body.language] ? body.language : 'python';
    const size = body.size === 'long' ? 'long' : 'short';
    const known = Array.isArray(body.done_titles) ? body.done_titles.map(String).slice(0, 20) : [];
    // 添付したスクリーンショット（分からないことが書いてある画面など）。期限つきURLで受け取る
    const imageUrls = (Array.isArray(body.image_urls) ? body.image_urls : [])
      .map((u) => String(u || ''))
      .filter((u) => /^https:\/\//.test(u))
      .slice(0, 5);
    // 解けなかったコーディング問題から写経を作るとき
    const problem = body.problem_id
      ? await base44.entities.Problem.get(String(body.problem_id)).catch(() => null)
      : null;
    const template = problem
      ? ((problem.templates || []).find((t) => t.language === language) || {}).code || ''
      : '';
    if (!goal && !imageUrls.length && !problem) return Response.json({ error: '身につけたいことを書くか、スクリーンショットを添付してください' }, { status: 400 });

    const lines = size === 'long' ? '25〜45行' : '10〜25行';

    const prompt = `あなたはプログラミング初心者のための写経（お手本のコードを書き写して、手と目で型を覚える練習）の教材を作る先生です。

【学習者が身につけたいこと】${goal || (problem ? `次の問題の解き方` : '（文章での指定なし。添付した画像から読み取る）')}${
      problem
        ? `
【学習者が解けなかった問題】
タイトル: ${problem.title}
${String(problem.statement || '').slice(0, 3000)}
制約: ${problem.constraints || '特になし'}
テストケース: ${(problem.test_cases || []).map((t) => `${t.input} → ${t.expected}`).join(' / ') || 'なし'}
${template ? `ひな形（関数の名前と引数はこれに合わせる）:\n${template.slice(0, 1500)}` : ''}
- code は、この問題の素直で標準的な解答にする。ひな形の関数を完成させ、main では問題のテストケースの入力で関数を呼んで結果を表示する。
- 凝った解き方ではなく、初心者が型として覚えやすい解き方を選ぶ。計算量が大きく悪くならない範囲で、読みやすさを優先する。
- line_notes では、解き方の要になる行（考え方が出ている行）を中心に説明する。
- follow_up は、この問題と同じではなく、同じ型を使う別の易しい問題にする。`
        : ''
    }${
      imageUrls.length
        ? `
【添付した画像】${imageUrls.length}枚。学習者が読んで分からなかったもの（教科書・解説・ほかのAIとの会話・エラー画面など）のスクリーンショット。
- まず画像に何が書かれているかを読み取り、学習者が分からなかったと考えられる要点（使われている書き方・仕組み）を見極める。
- その要点を、写経で手に覚えられるお手本にする。画像にコードがあれば、その書き方の型をなぞれるようにし、長すぎる・凝りすぎている部分は初心者向けに素直に書き直す。
- 文章での指定もあるときは、文章を優先し、画像はその手がかりとして使う。
- summary の1文目で、画像のどの部分を写経にしたかを短く書く。`
        : ''
    }
【言語】${LANG[language]}
【学習者】授業で少し習ったが、まだ自分では手が動かない初心者。写経から入りたい。
【もう写経したもの（同じ内容は避ける）】${known.length ? known.join('、') : 'なし'}

作るもの:
1. code: 写経するお手本コード（${lines}）。
- そのまま${LANG[language]}で動く、正しいコードにする。${language === 'python' ? 'Python 3。' : language === 'c' ? 'C言語（C11）だけで書き、C++の機能は使わない。' : 'C++17。using namespace std; は使ってよい。'}
- 身につけたいことの「型」がはっきり見える、ふつうの書き方にする。凝った書き方・短縮した書き方・珍しい関数は使わない。
- 小さな main（${language === 'python' ? 'if __name__ == "__main__": の下' : 'main 関数'}）で、実行すると結果が表示されるようにする。
- コメントは日本語で、要所にだけ短く（1行10〜25文字）。行末に長いコメントを付けない。
- インデントはスペース4つ。タブは使わない。全角文字はコメントと文字列の中だけ。
2. title: 15文字以内の見出し。
3. summary: この写経で身につくことを2文で。
4. line_notes: 大事な行（5〜10行）について、その行が何をしているかと、なぜそう書くかを1〜2文で。line は code の1始まりの行番号で、必ずその行の内容に合わせる。
5. key_points: 写経したあとに覚えておきたい型を3つ、各30文字以内。
6. follow_up: 写経のあとに解く練習問題。お手本の型をほぼそのまま使い、一部を変えれば解ける易しい問題にする（例: 数えるものを変える、条件を1つ足す）。
- statement は入出力がはっきり分かる日本語。関数のシグネチャを書く。
- hints は3段階（方向づけ → 使う型 → 手順）。答えのコードは書かない。
- test_cases は3つ、境界の場合を1つ含める。
- template は${LANG[language]}のひな形（関数のシグネチャと空の本体、動かすための main）。
- topics は2〜3個の短いトピック名。

全体のルール: 技術用語は正確な標準用語を使い、比喩や曖昧な言い換えはしない。親しみやすく簡潔な日本語で書く。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
      model: 'gemini_3_1_pro',
      ...(imageUrls.length ? { file_urls: imageUrls } : {}),
    });

    // コードのタブはスペースにそろえ、末尾の空白を落とす（写経で見えない違いを作らない）
    const code = String(out?.code || '')
      .replace(/\t/g, '    ')
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .join('\n')
      .replace(/^\n+|\n+$/g, '');
    if (code.split('\n').length < 4) return Response.json({ error: 'お手本を作れませんでした。もう一度お試しください。' }, { status: 500 });
    const lineCount = code.split('\n').length;

    const drill = await base44.entities.TraceDrill.create({
      goal: goal || (problem ? `問題「${String(problem.title).slice(0, 40)}」の解き方` : `スクリーンショットから: ${String(out.title || '').slice(0, 40)}`),
      ...(problem ? { source_problem_id: problem.id } : {}),
      language,
      title: String(out.title || goal || '写経').slice(0, 60),
      summary: String(out.summary || '').slice(0, 400),
      code,
      line_notes: (out.line_notes || [])
        .map((n) => ({ line: Math.round(Number(n.line)), note: String(n.note || '').slice(0, 300) }))
        .filter((n) => n.line >= 1 && n.line <= lineCount && n.note)
        .slice(0, 14),
      key_points: (out.key_points || []).map((p) => String(p).slice(0, 80)).slice(0, 4),
      follow_up: out.follow_up || null,
      level: 0,
      completions: 0,
      history: [],
    });

    return Response.json({ drill });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
