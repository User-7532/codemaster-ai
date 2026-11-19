import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// お手本を隠して書くときの「問題文」を作る。
// 手順を書かない問題文（brief）、全体の1文（overview）、上から順の手順（steps）、
// そして「名前・型をお手本と合わせる必要がある宣言」を場所ごとにまとめた signatures。
const LANG = { python: 'Python', c: 'C', cpp: 'C++' };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const drill = await base44.entities.TraceDrill.get(String(body.drill_id || '')).catch(() => null);
    if (!drill) return Response.json({ error: 'Not found' }, { status: 404 });
    if (drill.spec?.steps?.length && drill.spec?.brief && drill.spec?.signatures?.length && !body.force) {
      return Response.json({ spec: drill.spec });
    }

    const lines = String(drill.code || '').split('\n');
    const numbered = lines.map((l, i) => `${String(i + 1).padStart(3, ' ')}| ${l}`).join('\n');

    const prompt = `次の${LANG[drill.language] || ''}のお手本コードを、学習者がお手本を見ずに書くための「問題文」にしてください。学習者は初心者で、書いた結果はお手本と一字一句比べられます。

【お手本（左は行番号）】
${numbered}

作るもの:
- brief: 試験の問題文のような、手順を書かない問題文。2〜4文。
  - 何を作るか（データ構造・関数の役割・main で何をして何を表示するか）だけを書き、どう実装するか（処理の順番、添字の増減、使う式など）は書かない。
  - 名前や型は、下の signatures で別に示すので、brief の中では \`名前\` を並べすぎない。
- overview: このプログラムが全体として何をするかを1文（40文字以内）。
- signatures: 学習者が「名前・型・初期値」をお手本と一致させる必要がある宣言を、場所ごとに書き出す。配列。
  - 各項目は { where, code }。
    - where: どこでの宣言かを短く（例:「関数の宣言」「main の中で用意する変数」「置換する文字」「表示に使う書式」）。
    - code: お手本のその宣言を、名前・型・初期値まで、ほぼそのまま1行で。処理の中身（ループ・条件・計算・代入の連なり）は入れない。
  - 1つの宣言＝1項目。変数が複数ある場所は項目を分ける。
  - main や return 単体のような、名前合わせに関係ない無意味な項目は作らない。#include / import はここに入れない（覚えるだけなので）。
  - 表示に使う書式文字列（"...%s..." など）は「表示に使う書式」としてまとめてよい。
  - 多くても8項目。学習者が「宣言部分の名前」を迷わないためのものにする。
- steps: 上から順に書くものを、まとまりごとに4〜8個。各ステップは
  - text: そこで何を書くかを1〜2文で。簡潔に、しかし何を書けばよいか迷わないように具体的に書く。
    - 名前・型・定数の値・表示する文字列など、一致させる必要があるものは \`名前\` の形でそのまま書く。
    - 処理の中身は、コードではなく言葉で書く（例:「\`top\` の位置に \`c\` を入れてから、\`top\` を1増やす」）。
    - #include や import、コメント行は「〜を読み込む」などと短く書く。
    - 答えのコードをそのまま書き写したような文にはしない。
  - from, to: そのステップに当たるお手本の行番号の範囲（両端を含む）。重ならず、空行を除いて全部の行がどこかのステップに入るように。
- 日本語で。技術用語は正確な標準用語を使う。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          brief: { type: 'string' },
          overview: { type: 'string' },
          signatures: {
            type: 'array',
            items: {
              type: 'object',
              properties: { where: { type: 'string' }, code: { type: 'string' } },
              required: ['where', 'code'],
            },
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: { text: { type: 'string' }, from: { type: 'number' }, to: { type: 'number' } },
              required: ['text', 'from', 'to'],
            },
          },
        },
        required: ['brief', 'overview', 'signatures', 'steps'],
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

    const signatures = (out?.signatures || [])
      .map((s) => ({ where: String(s.where || '').slice(0, 40), code: String(s.code || '').slice(0, 200) }))
      .filter((s) => s.where && s.code)
      .slice(0, 8);

    const spec = {
      brief: String(out.brief || '').slice(0, 600),
      overview: String(out.overview || '').slice(0, 120),
      signatures,
      steps,
    };
    await base44.entities.TraceDrill.update(drill.id, { spec });
    return Response.json({ spec });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
