import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { problem_id, messages = [], last_result = '' } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    let problemBlock = '（問題の指定なし。直前の採点結果について話す）';
    if (problem_id) {
      const problem = await base44.entities.Problem.get(problem_id).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
      if (problem) {
        problemBlock = `【問題】${problem.title}\n${problem.statement}`;
      }
    }

    const history = messages
      .slice(-12)
      .map((m) => `${m.role === 'user' ? '学習者' : 'メンター'}: ${String(m.content).slice(0, 2000)}`)
      .join('\n');

    const prompt = `あなたは技術面接対策のメンターです。学習者と対話して「なぜその解き方になるのか」の構造的な理解を深めます。

${problemBlock}

【直前の採点結果の要約】
${last_result ? String(last_result).slice(0, 4000) : 'なし'}

【これまでのやりとり】
${history}

返事のルール:
- 日本語で。まず学習者の質問に正面から答える。前置きは短く。
- 基本情報技術者試験レベルの語彙だけを使う。学術的な横文字・衒学的な言い回しは禁止。専門用語を使うときは必ず短い言い換えを添える。
- 図や表が有効なときは、テキストで簡単な図（矢印や表）を使ってよい。
- 4〜8行程度。最後に、学習者自身が手を動かして確認できる小さな一歩を1つ示す。
- 完成コードを丸ごと渡さない。`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ reply: String(reply || '').trim() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}