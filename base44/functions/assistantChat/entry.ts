import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

function jaDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 参照する直近の会話数と、保存する要点の上限。増やしすぎると応答が遅くなる
const HISTORY_LIMIT = 12;
const SUMMARY_MAX = 1200;
const LEARNING_MAX = 900;

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
    const message = String(body.message || '').trim().slice(0, 1000);
    const page = String(body.page || '').slice(0, 60);
    const path = String(body.path || '').slice(0, 120);
    const pageContext = String(body.context || '').trim().slice(0, 1600);
    const quote = String(body.quote || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!message) return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);

    const [{ items: history }, { items: memories }, { items: subs }, { items: reviews }, { items: attempts }, { items: problems }] =
      await Promise.all([
        base44.entities.AssistantMessage.filter({ created_by_id: user.id }, { sort: '-created_date', limit: HISTORY_LIMIT }),
        base44.entities.AssistantMemory.filter({ created_by_id: user.id }, { sort: '-created_date', limit: 1 }),
        base44.entities.Submission.filter({ created_by_id: user.id }, { sort: '-created_date', limit: 40 }),
        base44.entities.ReviewItem.filter({ created_by_id: user.id }, { sort: 'due_date', limit: 100 }),
        base44.entities.KnowledgeAttempt.filter({ created_by_id: user.id }, { sort: '-created_date', limit: 60 }),
        base44.entities.Problem.list({ sort: 'order_index', limit: 100 }),
      ]);

    const memory = memories[0] || null;

    const correctCount = subs.filter((s) => s.verdict === 'correct').length;
    const accuracy = subs.length ? Math.round((correctCount / subs.length) * 100) : 0;
    const solvedIds = new Set(subs.filter((s) => s.verdict === 'correct').map((s) => s.problem_id));
    const curriculum = problems.filter((p) => p.source === 'curriculum');
    const dueCount = reviews.filter((r) => r.due_date <= today).length;

    // 今日（日本時間）の提出回数。進み具合を聞かれたときに使う
    const toJstDate = (iso) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const todayJst = toJstDate(new Date().toISOString());
    const todayLabel = `${Number(todayJst.slice(5, 7))}/${Number(todayJst.slice(8, 10))}`;
    const todaySubs = subs.filter((s) => s.created_date && toJstDate(s.created_date) === todayJst);
    const todayCorrect = todaySubs.filter((s) => s.verdict === 'correct').length;

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

    const historyAsc = history.slice().reverse();
    const recentTalk = historyAsc
      .map((m) => `${m.role === 'user' ? '本人' : 'あなた'}: ${m.quote ? `（引用「${String(m.quote).slice(0, 200)}」について）` : ''}${String(m.content).slice(0, 500)}`)
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
- 以前の会話の要点は下に渡す。要点と直近の会話が食い違うときは、直近の会話を優先する。
- 要点に書かれていない過去の出来事を、あったかのように話さない。
- 画面の要素に触れるときは、渡された抜粋に実際に書かれている語だけを使う。存在しないメニュー・ボタン・ページ名を作り話にしない。
- 質問の意図が2通りに取れるときは、両方に短く触れるか、確認を1つだけ聞く。
- 記号の装飾（アスタリスクや見出し記号）は使わない。長さは問いの重さに合わせる（目安は2〜6文、必要なときだけ長くする）。
- 今日の進み具合を聞かれたら、良かった点を具体的に1つ以上挙げ、次に伸ばせそうな点を1つだけ添える。責める調子にせず、本人の努力が伝わる書き方にする。
- 息抜きや雑談を求められたら、学習の記録から関心がありそうな技術の話題を1つ選び、短く話す。そのあと学習に戻るよう急かさない。

【いま見ている画面】${page || '不明'}${path ? `（${path}）` : ''}
【画面に表示されている内容（抜粋）】
${pageContext || '（取得できませんでした）'}

【以前の会話から残している要点】
${memory?.summary || '（まだありません）'}

【学習の傾向の要点（自動更新）】
${memory?.learning || '（まだありません）'}

【いまの学習状況】
- 提出した回数: ${subs.length}回 / 正解 ${correctCount}回 / 正答率 ${accuracy}%
- 解いた問題: ${solvedIds.size}問 / カリキュラム全${curriculum.length}問
- 復習待ち: ${dueCount}件
- 今日（${todayLabel}）の提出: ${todaySubs.length}回 / 正解 ${todayCorrect}回
- 苦手なトピック: ${weak.join('、') || 'まだ十分な記録なし'}
- 知識モードの正答率: ${domainLine || '記録なし'}
- 最近の提出（新しい順）:
${recent || 'まだ提出なし'}

【直近の会話（古い順）】
${recentTalk || '（はじめての会話）'}

【今回引用された本文（この部分についての質問）】
${quote ? `「${quote}」` : '（引用なし）'}

【今回の発言】${message}`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const text = String(reply || '').trim() || 'うまく答えを作れませんでした。もう一度話しかけてください。';

    const created = await base44.entities.AssistantMessage.bulkCreate([
      { role: 'user', content: message, quote },
      { role: 'assistant', content: text },
    ]);
    const createdList = Array.isArray(created) ? created : created?.items || [];

    // 要点の更新は会話の返答を待たせない。失敗しても会話はそのまま続く
    try {
      const since = memory?.last_message_date || '';
      const fresh = [
        ...(since ? historyAsc.filter((m) => m.created_date > since) : historyAsc),
        ...(createdList.length
          ? createdList.map((m) => ({ role: m.role, content: m.content, quote: m.quote || '', created_date: m.created_date }))
          : [
              { role: 'user', content: message, quote, created_date: new Date().toISOString() },
              { role: 'assistant', content: text, created_date: new Date().toISOString() },
            ]),
      ];

      if (fresh.length > 0) {
        const talk = fresh
          .map((m) => `${m.role === 'user' ? '本人' : 'あなた'}: ${m.quote ? `（引用「${String(m.quote).slice(0, 200)}」について）` : ''}${String(m.content).slice(0, 400)}`)
          .join('\n');

        const digest = [
          `提出 ${subs.length}回 / 正解 ${correctCount}回 / 正答率 ${accuracy}%`,
          `解いた問題 ${solvedIds.size}問 / カリキュラム全${curriculum.length}問`,
          `復習待ち ${dueCount}件`,
          `今日(${todayLabel}) 提出 ${todaySubs.length}回 / 正解 ${todayCorrect}回`,
          `苦手 ${weak.join('、') || '記録なし'}`,
          `知識 ${domainLine || '記録なし'}`,
        ].join('\n');

        const memo = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `次の会話と学習記録から、次回以降も覚えておくべき要点だけを短くまとめ直します。要約を作る作業です。

【これまでに残している要点】
${memory?.summary || '（まだありません）'}

【これまでの学習の傾向の要点】
${memory?.learning || '（まだありません）'}

【前回の要点よりあとの会話（古い順）】
${talk}

【いまの学習記録の数値】
${digest}

【まとめ方】
- summary には、本人の学習の目標、好み（説明の粒度・言葉づかい・進め方の希望）、継続中の話題や悩み、決めたことだけを残す。一度きりの質問や作業の細部、言い換え、雑談の内容は残さない。
- learning には、学習記録から読み取れる傾向（伸びている分野、誤答が続く分野、復習の滞り、最近の取り組み）を残す。数値は「いまの学習記録の数値」を正とし、以前の数値を足し合わせない。
- 前回の要点と新しい会話が食い違うときは、新しい内容で置き換える。同じ内容を重ねて書かない。
- 箇条書きの記号は使わず、意味のまとまりごとに短い文を並べる。summary は${SUMMARY_MAX}文字以内、learning は${LEARNING_MAX}文字以内。
- 残すべき内容がない項目は空文字にする。要点になかった出来事を作らない。

JSONで返す。`,
          response_json_schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              learning: { type: 'string' },
            },
            required: ['summary', 'learning'],
          },
        });

        const patch = {
          summary: String(memo?.summary || '').trim().slice(0, SUMMARY_MAX),
          learning: String(memo?.learning || '').trim().slice(0, LEARNING_MAX),
          last_message_date: fresh[fresh.length - 1].created_date || new Date().toISOString(),
          message_count: (memory?.message_count || 0) + fresh.length,
        };

        if (memory) await base44.entities.AssistantMemory.update(memory.id, patch);
        else await base44.entities.AssistantMemory.create(patch);
      }
    } catch {
      // 要点の更新に失敗しても、返答はそのまま返す
    }

    return Response.json({ reply: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}