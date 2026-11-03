import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_ANSWER = 3000;

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
    feedback: { type: 'string' },
  },
  required: ['correct', 'feedback'],
};

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = String(body.card_id || '');
    const answerText = String(body.answer_text || '').trim().slice(0, MAX_ANSWER);
    if (!cardId) return Response.json({ error: 'card_id is required' }, { status: 400 });
    if (!answerText) return Response.json({ error: 'answer_text is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await base44.entities.KnowledgeCard.get(cardId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });

    const points = Array.isArray(card.expected_points) ? card.expected_points.filter(Boolean) : [];
    const pointBlock = points.length
      ? `【問題文で求めている要素（採点の観点）】\n- ${points.join('\n- ')}\n`
      : '';

    const prompt = `あなたはIT資格と技術面接の採点者です。次の記述問題に対する学習者の解答を判定してください。

【問題】${card.text}
【想定した解答】${card.model_answer || card.answer || '(なし)'}
${pointBlock}【解説】${card.explanation || '(なし)'}

判定の基準:
- 採点の観点は、問題文で求められている要素だけにする。問題文で求めていない要素まで書いていないことを理由に不正解にしない。
- 問題文で「2つ」「3つの観点」のように数が示されているときは、その数だけ挙げられているかを確認する。数が足りない場合は不正解。
- 想定した解答の要点を、自分の言葉で説明できていれば正解。
- 要点が抜けている、逆の意味になっている、あいまいで正誤がはっきりしない場合は不正解。
- 迷う場合は不正解にする。ただし用語の表記の違いだけなら正解にする。
- 問題が名称（頭字語・正式名称など）を答えるよう求めている場合は、求められた名称がすべて解答に含まれているときだけ正解にする。例えば「略称と正式名称を答えよ」なら両方、「正式名称を答えよ」なら正式名称が必要。問題文にすでに書かれている名称を解答に書かなかったことは、減点しない。足りないときは不正解にし、feedback で正式名称を添える。

【学習者の解答】
${answerText}

feedback は日本語で2〜3文。正解なら、足りない観点があれば1つだけ添える。不正解なら、抜けている要点を具体的に示す。技術用語は正確に、励ます調子で書く。`;

    const verdict = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: VERDICT_SCHEMA,
    });

    return Response.json({
      correct: verdict?.correct === true,
      feedback: String(verdict?.feedback || '').trim(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}