import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// 記述問題の聞き方を見直す。答え方が何通りもある問い（「どのような〜があるか」など）を、
// 観点・数・条件を指定して答えの範囲が定まる問いに書き直し、模範解答もそれに合わせる
const BATCH = 12;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ambiguous: { type: 'boolean' },
          text: { type: 'string' },
          model_answer: { type: 'string' },
          answer: { type: 'string' },
          target_terms: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'ambiguous', 'text', 'model_answer', 'answer', 'target_terms'],
      },
    },
  },
  required: ['items'],
};

const normalize = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐_]/g, '');

// 書き直した問題文に、答えさせたい語句が出ていないか
function leaks(text, terms) {
  const body = normalize(text);
  return (terms || [])
    .map(normalize)
    .filter((t) => t.length >= 2 && !/^[0-9.]+$/.test(t))
    .some((t) => body.includes(t));
}

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
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean).slice(0, BATCH) : [];

    // 指定がなければ、まだ見直していない記述問題を古い順に少しずつ
    const page = ids.length
      ? await base44.entities.KnowledgeCard.filter({ id: { $in: ids } }, { limit: BATCH })
      : await base44.entities.KnowledgeCard.filter({ kind: 'written' }, { sort: 'created_date', limit: 500 });
    const pending = (page.items || []).filter((c) => c.kind === 'written' && c.refined !== true);
    const batch = pending.slice(0, BATCH);
    if (!batch.length) return Response.json({ refined: 0, changed: 0, remaining: 0, cards: [] });

    const list = batch
      .map(
        (c) =>
          `id: ${c.id}\n問題: ${c.text}\n模範解答: ${c.model_answer || ''}\n要点: ${c.answer || ''}\n解説: ${c.explanation || ''}`
      )
      .join('\n\n');

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `あなたはIT技術の記述問題を点検する編集者です。次の記述問題が、解答者にとって「何を答えれば正解になるか」が分かる聞き方になっているかを1問ずつ確かめてください。

あいまいな問いの例:
- 「〜にはどのようなものがあるか」「〜のメリットは何か」のように、正しい答えが何通りもあり、どの答えを求めているのか分からない。
- 求める観点・数・場面が書かれておらず、模範解答とは別の正しい答えを書いても不正解にされかねない。

やること（1問ごと）:
- ambiguous: あいまいなら true、答えの範囲が定まっているなら false。
- あいまいな問いは、模範解答の内容が正解になるように、問題文に観点・数・条件を足して書き直す。例: 「計画フェーズで目標性能を満たすための施策を、ソフトウェア面とハードウェア面から1つずつ挙げよ。」
- 書き直すときも、模範解答に出てくる用語そのもの（答えさせたい語句）は問題文に書かない。答えを示唆しすぎない。
- model_answer は書き直した問いにぴったり答える2〜4文、answer はその要点を10〜20字にする。あいまいでない問いは、text・model_answer・answer を元のまま返す。
- target_terms には、解答者が自分で答えるべき語句を入れる。
- 日本語で、技術用語は正確な標準用語を使う。問いの主題や難しさは変えない。

[記述問題]
${list}`,
      response_json_schema: SCHEMA,
    });

    const byId = new Map((Array.isArray(out?.items) ? out.items : []).map((x) => [String(x.id), x]));
    let changed = 0;
    const updated = [];
    for (const card of batch) {
      const fix = byId.get(card.id);
      const patch = { refined: true };
      const text = String(fix?.text || '').trim();
      // 書き直しがあいまいさを解消していて、答えを漏らしていないときだけ置き換える
      if (fix?.ambiguous && text && text !== card.text && !leaks(text, fix.target_terms)) {
        patch.text = text.slice(0, 600);
        if (String(fix.model_answer || '').trim()) patch.model_answer = String(fix.model_answer).trim().slice(0, 800);
        if (String(fix.answer || '').trim()) patch.answer = String(fix.answer).trim().slice(0, 200);
        changed += 1;
      }
      await base44.entities.KnowledgeCard.update(card.id, patch);
      updated.push({ ...card, ...patch });
    }

    return Response.json({
      refined: batch.length,
      changed,
      remaining: ids.length ? 0 : Math.max(0, pending.length - batch.length),
      cards: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
