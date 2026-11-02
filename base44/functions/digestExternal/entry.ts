import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ほかのAIとの会話の記録から、(1) アシスタントが覚えておく要点を更新し、
// (2) コーディング問題にできる題材を取り出す。知識問題は generateKnowledge が別に作る
const SUMMARY_MAX = 1200;

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    coding: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          request: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
        },
        required: ['topic', 'request', 'difficulty'],
      },
    },
  },
  required: ['summary', 'coding'],
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
    const text = String(body.text || '').trim().slice(0, 60000);
    if (text.length < 40) return Response.json({ error: '貼り付けた文章が短すぎます' }, { status: 400 });

    const { items: memories } = await base44.entities.AssistantMemory.filter(
      { created_by_id: user.id },
      { sort: '-created_date', limit: 1 }
    );
    const memory = memories[0] || null;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `次は、利用者がほかのAIと交わした対話の記録です。この記録を、学習アプリ「CodeMaster AI」全体に活かすための情報に変えます。

【これまでに残している要点】
${memory?.summary || '（まだありません）'}

【やること】
1. summary: これまでの要点に、この対話から分かったことを統合して、要点を書き直す。
- 残すのは、本人の学習の目標、関心のある分野、理解できたこと、つまずいたこと・誤解していたこと、説明の好み、継続中の話題、決めたこと。
- 本人が実際に言ったこと・示したことだけを残す。AIの説明そのものや一般論は残さない。推測で人物像を作らない。
- これまでの要点と食い違うときは新しい内容で置き換え、同じ内容を重ねない。箇条書きの記号は使わず、短い文を並べる。${SUMMARY_MAX}文字以内。
2. coding: 対話で扱われたアルゴリズム・データ構造・実装の話題のうち、関数1つで解くプログラミング問題にできるものを0〜3件。
- request には、その題材で問題を作るための依頼文を1〜2文で書く（例: 「対話で扱ったスライディングウィンドウを使い、部分配列の最大和を求める問題」）。
- コードの話題がなければ空の配列にする。無理に作らない。
- difficulty は対話での本人の理解度に合わせる。

【対話の記録】
${text}`,
      response_json_schema: SCHEMA,
    });

    const summary = String(out?.summary || '').trim().slice(0, SUMMARY_MAX);
    let updated = false;
    if (summary) {
      if (memory) await base44.entities.AssistantMemory.update(memory.id, { summary });
      else await base44.entities.AssistantMemory.create({ summary, learning: '', message_count: 0 });
      updated = true;
    }

    const coding = (Array.isArray(out?.coding) ? out.coding : [])
      .filter((c) => String(c?.request || '').trim())
      .slice(0, 3)
      .map((c) => ({
        topic: String(c.topic || '').slice(0, 40),
        request: String(c.request || '').slice(0, 400),
        difficulty: ['basic', 'intermediate', 'advanced'].includes(c.difficulty) ? c.difficulty : 'basic',
      }));

    return Response.json({ updated, coding });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
