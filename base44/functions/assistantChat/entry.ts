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
    const path = String(body.path || '').slice(0, 120);
    const pageContext = String(body.context || '').trim().slice(0, 1600);
    const quote = String(body.quote || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!message) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);

    const [{ items: history }, { items: subs }, { items: reviews }, { items: attempts }, { items: problems }] =
      await Promise.all([
        base44.entities.AssistantMessage.list({ sort: '-created_date', limit: 12 }),
        base44.entities.Submission.list({ sort: '-created_date', limit: 40 }),
        base44.entities.ReviewItem.filter({}, { sort: 'due_date', limit: 100 }),
        base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 60 }),
        base44.entities.Problem.list({ sort: 'order_index', limit: 100 }),
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
      .slice(0, 8)
      .map((s) => `- ${jaDate(s.created_date)} ${s.problem_title || '無題'} / ${s.language || '-'} / ${s.verdict === 'correct' ? '正解' : s.verdict === 'partial' ? '部分点' : '不正解'}`)
      .join('\n');

    const historyText = history
      .slice()
      .reverse()
      .map((m) => `${m.role === 'user' ? '本人' : 'あなた'}: ${String(m.content).slice(0, 600)}`)
      .join('\n');

    const prompt = `あなたは「CodeMaster AI」の学習アシスタントです。本人の学習状況と、いま見ている画面の内容を踏まえて会話します。

【答え方】
- まず質問に直接答える。結論を先に書き、理由や補足はそのあとに続ける。
- 読みやすい簡潔な日本語で書く。ただし、用語や条件を削って解釈が分かれる書き方はしない。必要な定義や例は1つ添える。
- 専門用語は正確な標準用語で書く。比喩や曖昧な言い換えはしない。
- 提案や次の手順は、そのほうが役立つと判断したときだけ添える。毎回つける必要はない。
- 定型の前置き・定型の締め（「記録を見るかぎり」「次にやること」など）や、同じ構成の繰り返しは書かない。
- 箇条書きは、並列な情報を並べるときだけ使う。ふつうの説明は文章で書く。
- 画面や記録に出ていないことは断定しない。確かでないときは、その旨を短く伝える。
- 画面の要素に触れるときは、渡された抜粋に実際に書かれている語だけを使う。存在しないメニュー・ボタン・ページ名を作り話にしない。
- 質問の意図が2通りに取れるときは、両方に短く触れるか、確認を1つだけ聞く。
- 記号の装飾（アスタリスクや見出し記号）は使わない。長さは問いの重さに合わせる（目安は2〜6文、必要なときだけ長くする）。

【いま見ている画面】${page || '不明'}${path ? `（${path}）` : ''}
【画面に表示されている内容（抜粋）】
${pageContext || '（取得できませんでした）'}

【学習状況の記録】
- 提出した回数: ${subs.length}回 / 正解 ${correctCount}回 / 正答率 ${accuracy}%
- 解いた問題: ${solvedIds.size}問 / カリキュラム全${curriculum.length}問
- 復習待ち: ${dueCount}件
- 苦手なトピック: ${weak.join('、') || 'まだ十分な記録なし'}
- 知識モードの正答率: ${domainLine || '記録なし'}
- 最近の提出（新しい順）:
${recent || 'まだ提出なし'}

【今回引用された本文（この部分についての質問）】
${quote ? `「${quote}」` : '（引用なし）'}

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