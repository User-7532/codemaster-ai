import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

function jaDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 1000);
    const page = String(body.page || '').slice(0, 60);
    if (!message) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);

    const [{ items: history }, { items: subs }, { items: reviews }, { items: attempts }, { items: problems }] =
      await Promise.all([
        base44.entities.AssistantMessage.list({ sort: '-created_date', limit: 12 }),
        base44.entities.Submission.list({ sort: '-created_date', limit: 100 }),
        base44.entities.ReviewItem.filter({}, { sort: 'due_date', limit: 200 }),
        base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 100 }),
        base44.entities.Problem.list({ sort: 'order_index', limit: 200 }),
      ]);

    const correctCount = subs.filter((s) => s.verdict === 'correct').length;
    const accuracy = subs.length ? Math.round((correctCount / subs.length) * 100) : 0;
    const solvedIds = new Set(subs.filter((s) => s.verdict === 'correct').map((s) => s.problem_id));
    const curriculum = problems.filter((p) => p.source === 'curriculum');
    const dueCount = reviews.filter((r) => r.due_date <= today).length;

    const topicStats = {};
    subs.forEach((s) => {
      (s.topics || []).forEach((t) => {
        topicStats[t] = topicStats[t] || { total: 0, wrong: 0 };
        topicStats[t].total += 1;
        if (s.verdict !== 'correct') topicStats[t].wrong += 1;
      });
    });
    const weak = Object.entries(topicStats)
      .map(([topic, v]) => ({ topic, rate: v.wrong / v.total, total: v.total }))
      .filter((t) => t.total >= 2)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4)
      .map((t) => `${t.topic}（誤答 ${Math.round(t.rate * 100)}%）`);

    const domainStats = {};
    attempts.forEach((a) => {
      const d = a.domain || '未分類';
      domainStats[d] = domainStats[d] || { total: 0, ok: 0 };
      domainStats[d].total += 1;
      if (a.correct) domainStats[d].ok += 1;
    });
    const domainLine = Object.entries(domainStats)
      .map(([d, v]) => `${d} ${Math.round((v.ok / v.total) * 100)}%（${v.total}問）`)
      .join('、');

    const recent = subs
      .slice(0, 10)
      .map((s) => `- ${jaDate(s.created_date)} ${s.problem_title || '無題'} / ${s.language || '-'} / ${s.verdict === 'correct' ? '正解' : s.verdict === 'partial' ? '部分点' : '不正解'}`)
      .join('\n');

    const historyText = history
      .slice()
      .reverse()
      .map((m) => `${m.role === 'user' ? '本人' : 'あなた'}: ${String(m.content).slice(0, 600)}`)
      .join('\n');

    const prompt = `あなたは「CodeMaster AI」の学習アシスタントです。本人の学習履歴と今の状態を見ながら、短く具体的に答えます。

【話し方のルール】
- やさしい日本語だが、専門用語は正確な標準用語で書く。比喩や曖昧な言い換えはしない。
- 3〜6文、または短い箇条書き3〜5個まで。長い前置きは書かない。
- 記号の装飾（アスタリスクや見出し記号など）は使わず、ふつうの文章で書く。
- 最後に、次にやるとよいことを1つだけ短く添える。
- わからないことは推測で断定しない。「記録を見るかぎり」と前置きする。

【本人の今の状態】
- 今見ている画面: ${page || '不明'}
- 提出した回数: ${subs.length}回 / 正解 ${correctCount}回 / 正答率 ${accuracy}%
- 解いた問題: ${solvedIds.size}問 / カリキュラム全${curriculum.length}問
- 復習待ち: ${dueCount}件
- 苦手なトピック: ${weak.join('、') || 'まだ十分な記録なし'}
- 知識モードの正答率: ${domainLine || '記録なし'}
- 最近の提出（新しい順）:
${recent || 'まだ提出なし'}

【これまでの会話（古い順）】
${historyText || '（はじめての会話）'}

【今回の発言】${message}`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const text = String(reply || '').trim() || 'うまく答えを作れませんでした。もう一度話しかけてください。';

    await base44.entities.AssistantMessage.bulkCreate([
      { role: 'user', content: message },
      { role: 'assistant', content: text },
    ]);

    return Response.json({ reply: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}