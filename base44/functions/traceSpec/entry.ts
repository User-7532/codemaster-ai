import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// お手本を隠して書くときの「問題文」を作る。
// 何を作るかの1文と、上から順に書くものの手順（お手本の行の範囲つき）。コードそのものは書かない。
const LANG = { python: 'Python', c: 'C', cpp: 'C++' };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const drill = await base44.entities.TraceDrill.get(String(body.drill_id || '')).catch(() => null);
    if (!drill) return Response.json({ error: 'Not found' }, { status: 404 });
    if (drill.spec?.steps?.length && !body.force) return Response.json({ spec: drill.spec });

    const lines = String(drill.code || '').split('\n');
    const numbered = lines.map((l, i) => `${String(i + 1).padStart(3, ' ')}| ${l}`).join('\n');

    const prompt = `次の${LANG[drill.language] || ''}のお手本コードを、学習者がお手本を見ずに書くための「問題文」にしてください。学習者は初心者で、書いた結果はお手本と一字一句比べられます。

【お手本（左は行番号）】
${numbered}

作るもの:
- overview: このプログラムが全体として何をするかを1文（40文字以内）。
- steps: 上から順に書くものを、まとまりごとに4〜8個。各ステップは
  - text: そこで何を書くかを1〜2文で。簡潔に、しかし何を書けばよいか迷わないように具体的に書く。
    - 関数名・変数名・型・引数・定数の値・表示する文字列など、お手本と一致させる必要があるものは \`名前\` の形でそのまま書く（例:「大きさ10の \`char\` の配列 \`stack\` と、次に入れる位置 \`top\`（最初は0）を用意する」）。
    - 処理の中身は、コードではなく言葉で書く（例:「\`top\` の位置に \`c\` を入れてから、\`top\` を1増やす」）。
    - #include や import、コメント行のように覚えるだけのものは「〜を読み込む」「〜というコメントを書く」と短く書く。
    - 答えのコードをそのまま書き写したような文にはしない。
  - from, to: そのステップに当たるお手本の行番号の範囲（両端を含む）。ステップどうしで重ならず、空行を除いて全部の行がどこかのステップに入るようにする。
- 日本語で。技術用語は正確な標準用語を使う。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overview: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: { text: { type: 'string' }, from: { type: 'number' }, to: { type: 'number' } },
              required: ['text', 'from', 'to'],
            },
          },
        },
        required: ['overview', 'steps'],
      },
    });

    const n = lines.length;
    const steps = (out?.steps || [])
      .map((s) => ({
        text: String(s.text || '').slice(0, 300),
        from: Math.max(1, Math.min(n, Math.round(Number(s.from) || 1))),
        to: Math.max(1, Math.min(n, Math.round(Number(s.to) || 1))),
      }))
      .filter((s) => s.text)
      .map((s) => (s.to < s.from ? { ...s, to: s.from } : s))
      .sort((a, b) => a.from - b.from)
      .slice(0, 10);
    if (!steps.length) return Response.json({ error: '問題文を作れませんでした' }, { status: 500 });

    const spec = { overview: String(out.overview || '').slice(0, 120), steps };
    await base44.entities.TraceDrill.update(drill.id, { spec });
    return Response.json({ spec });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
