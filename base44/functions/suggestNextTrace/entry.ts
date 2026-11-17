import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// 写し終えた写経から、次に写経するとよいものを2〜3個提案する。
// 難しさは、今回の書きぶり（どの段階で・ミス・のぞいた回数）で決め、やる気が折れない「一歩先」にとどめる。
const LANG = { python: 'Python', c: 'C', cpp: 'C++' };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const drillId = String(body.drill_id || '');
    if (!drillId) return Response.json({ error: 'drill_id is required' }, { status: 400 });

    const drill = await base44.entities.TraceDrill.get(drillId).catch(() => null);
    if (!drill) return Response.json({ error: 'Not found' }, { status: 404 });

    const page = await base44.entities.TraceDrill.filter({ language: drill.language }, { sort: '-created_date', limit: 40 });
    const done = (page.items || []).filter((d) => d.id !== drill.id).map((d) => d.title).slice(0, 30);

    const last = (drill.history || []).slice(-1)[0] || {};
    const lines = String(drill.code || '').split('\n').length;
    const chars = String(drill.code || '').replace(/\s/g, '').length || 1;
    const mistakeRate = (Number(last.mistakes) || 0) / chars;
    // 書きぶりから、次の一歩の大きさを決める
    let pace = '同じくらいの難しさで、型の使い道を広げる';
    if (last.mode === 'hidden' && mistakeRate < 0.05 && (Number(last.peeks) || 0) <= 1) {
      pace = '少しだけ難しくする（新しい要素は1つだけ足す）';
    } else if (last.mode === 'ghost' || mistakeRate > 0.15) {
      pace = 'ほぼ同じ難しさ。同じ型を別の場面で使うものにする（新しい要素は足さない）';
    }

    const prompt = `あなたはプログラミング初心者の写経（お手本を書き写して型を身につける練習）の伴走者です。学習者がいま写経を1つ終えました。次に写経するとよいものを3つ提案してください。

【いま写し終えた写経】
タイトル: ${drill.title}
身につけたかったこと: ${drill.goal}
覚えた型: ${(drill.key_points || []).join(' / ') || '(なし)'}
言語: ${LANG[drill.language] || drill.language}
長さ: ${lines}行
今回の書きぶり: 段階=${last.mode === 'hidden' ? 'お手本を隠して書いた' : last.mode === 'side' ? 'お手本を見ながら書いた' : 'お手本をなぞって書いた'}、ミス${Number(last.mistakes) || 0}回、のぞいた回数${Number(last.peeks) || 0}回
【もう写経したもの（同じ内容は出さない）】${done.length ? done.join('、') : 'なし'}

【次の一歩の大きさ】${pace}

提案のルール:
- 3つとも、いま覚えた型をそのまま使える、地続きの内容にする。例: 基本のスタックを写したなら「スタックを汎用的にする」「スタックで括弧の対応を調べる」「スタックで文字列を逆順にする」のように。
- 3つの性格を分ける。1つ目は同じ型を別の場面で使う（step: "広げる"）、2つ目は同じ型を少し一般化・整理する（step: "整える"）、3つ目は新しい要素を1つだけ足して少し先へ進む（step: "一歩先"）。
- どれも${lines + 10}行以内で写せる小ささにする。いきなり大きなアプリや複数の新しい概念を組み合わせるものにしない。
- title は15文字以内。goal はそのまま写経の場を作る依頼になる1文（「〜を〜する書き方」の形）。why は、なぜ次にこれなのかを30文字以内で（前の写経とのつながりが分かるように）。
- 日本語。技術用語は正確な標準用語を使う。`;

    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                goal: { type: 'string' },
                why: { type: 'string' },
                step: { type: 'string', enum: ['広げる', '整える', '一歩先'] },
              },
              required: ['title', 'goal', 'why', 'step'],
            },
          },
        },
        required: ['items'],
      },
    });

    const next = (out?.items || [])
      .filter((x) => x?.title && x?.goal)
      .slice(0, 3)
      .map((x) => ({
        title: String(x.title).slice(0, 40),
        goal: String(x.goal).slice(0, 300),
        why: String(x.why || '').slice(0, 80),
        step: ['広げる', '整える', '一歩先'].includes(x.step) ? x.step : '広げる',
      }));

    await base44.entities.TraceDrill.update(drill.id, { next_steps: next });
    return Response.json({ next_steps: next });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
