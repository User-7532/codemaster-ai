import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_CODE = 20000;

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problem_id, level = 1, code = '' } = body;
    if (!problem_id) return Response.json({ error: 'problem_id is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const problem = await base44.entities.Problem.get(problem_id).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!problem) return Response.json({ error: 'Problem not found' }, { status: 404 });

    const lv = Math.max(1, Math.min(3, Number(level) || 1));
    const levelGuide = {
      1: '考え方の方向づけだけ。解き方の全体像には触れず「どこに目をつけるか」を一言で。',
      2: '使う道具（データ構造やアルゴリズムの名前）を1つ挙げ、なぜそれが効くのかを説明する。コードは書かない。',
      3: '具体的な手順を箇条書きで3〜4行。ただし完成コードは書かない。',
    };

    const prompt = `あなたは優しいプログラミングの先生です。学習者が次の問題を解いています。ヒントを1つだけ出してください。

【問題】${problem.title}
${problem.statement}

【学習者の今のコード】
\`\`\`
${code ? code.slice(0, MAX_CODE) : '(まだ何も書いていない)'}
\`\`\`

【ヒントのレベル】${lv} / 3
【このレベルで出す内容】${levelGuide[lv]}

ルール:
- 日本語で3文以内。基本情報技術者試験レベルの言葉だけを使い、難しい横文字には短い言い換えを添える。
- 答えのコードをそのまま書いてはいけない。
- 学習者の今のコードに明らかな間違いがあれば、まずそこを優しく指摘する。
- 最後に短い問いかけを1つ入れて、考えを促す。`;

    const hint = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ hint: String(hint || '').trim(), level: lv });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}