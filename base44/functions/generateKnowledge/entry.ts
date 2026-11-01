import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const WHOLE = { tech: 'すべて', cert: '混合', corp: '混合' };

const GENRE_LABEL = {
  tech: 'IT技術の基礎（プログラミング言語・ネットワーク・サイバーセキュリティ）',
  cert: 'IT資格試験',
  corp: '企業の技術面接',
  business: 'ビジネス・経営・KPIと技術の接点',
};

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          leaf: { type: 'string' },
          topic: { type: 'string' },
          kind: { type: 'string', enum: ['cloze', 'written'] },
          text: { type: 'string' },
          answer: { type: 'string' },
          model_answer: { type: 'string' },
          // 解答者が自分で答えるべき語句。問題文に出ていないかの確認に使う（保存はしない）
          target_terms: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
        },
        required: ['leaf', 'topic', 'kind', 'text', 'answer', 'target_terms', 'explanation', 'difficulty'],
      },
    },
  },
  required: ['cards'],
};

const RULES = `共通の書式:
- kind は "cloze"（空所補充）か "written"（記述）。1つの語句で答えられる知識は cloze、理由や仕組みの説明が必要な知識は written にする。
- cloze の text は1〜2文で、空所を ___（半角アンダースコア3つ）で表す。空所は1か所だけ。answer には空所に入る語句を短く入れる。
- written の text は答えを含まない問い。model_answer に2〜4文の模範解答を書き、answer には要点を10〜20字で入れる。
- explanation は1〜2文で、なぜそうなるかを平易に説明する。
- 日本語で書く。技術用語は正確な標準用語を使い、比喩や曖昧な言い換えはしない。
- 1問は短く。冗長な前置きや同じ内容の繰り返しは入れない。
- 問題文に答えを書かない。空所に入る語句、答えさせたい名前・略称・正式名称、その一部（例: 答えが「セッション層」なら「セッション」）や英語表記・括弧書きの補足も、問題文には入れない。
- target_terms には、解答者が自分で答えるべき語句（cloze の空所の語句、名前を答えさせる問いではその名前・略称・正式名称）をすべて入れる。仕組みや理由を説明させる問いで、主題として問題文に出てよい語は入れない。
- 頭字語（TLS、SLA、ROI、CAP、CSRF など）を問う written は次のどちらかの形にする。(1) 問題文では頭字語も正式名称も出さず、役割や特徴で説明したうえで「略称と正式名称の両方」を答えさせる。(2) 問題文で頭字語だけを示し、正式名称を答えさせる（正式名称は問題文に書かず、target_terms には正式名称だけを入れる）。model_answer は必ず「頭字語（英語の正式名称、日本語での呼び名）」の形でフルネームを書き、そのあとに説明を続ける。answer にも正式名称の要点を10〜20字で入れる。`;

// 答えの語句が問題文に出ている問題（例:「TCP（Transmission Control Protocol）の正式名称を答えよ」）を見つける
const normalize = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s・･\-‐_]/g, '');

function answerTerms(card) {
  const sources = [
    ...(card.kind === 'cloze' ? [card.answer] : []),
    ...(Array.isArray(card.target_terms) ? card.target_terms : []),
  ];
  const terms = [];
  sources.forEach((value) => {
    String(value || '')
      .normalize('NFKC')
      .split(/[()、,，/]/)
      .forEach((part) => {
        const t = normalize(part);
        if (!t) return;
        terms.push(t);
        // 「○○層」が答えなら「○○」だけでも答えになる
        if (t.length > 2 && t.endsWith('層')) terms.push(t.slice(0, -1));
      });
  });
  // 1文字の語や数字だけの語は偶然一致しやすいので見ない
  return terms.filter((t) => t.length >= 2 && !/^[0-9.]+$/.test(t));
}

function leaksAnswer(text, card) {
  const body = normalize(text.replace(/___/g, ' '));
  return answerTerms(card).some((term) => body.includes(term));
}

function genreRule(genre) {
  if (genre === 'tech') {
    return '- ビジネスや経営の話題は出さない。純粋に技術の理解だけを問う。';
  }
  if (genre === 'cert') {
    return `- その資格の出題範囲に沿う。用語の定義、仕組み、誤りやすい点を問う。日程・料金・制度の細目など変わりやすい情報は問わない。
- 6問のうち1問は、技術の選択がコストや機会損失にどう効くかを問う問題にしてよい。`;
  }
  if (genre === 'corp') {
    return `- 企業の技術面接で問われる観点（技術判断の説明、設計の考え方、基礎の正確さ、経験の伝え方）を扱う。日本企業と海外企業のどちらにも通じる内容にする。
- 特定企業の内部制度・選考フロー・非公開の情報は断定しない。公開されている技術領域や一般的な面接観点の範囲に限る。
- 6問のうち1問は、技術判断がビジネス指標（KPI、コスト、機会損失）にどう効くかを問う問題にしてよい。`;
  }
  return `- KPI、ユニットエコノミクス（LTV・CAC）、チャーンレート、ROI、TCO、SLA、機会損失、キャッシュフローなど、技術判断がビジネス指標に効く知識を扱う。
- 定義を問う cloze と、なぜその指標を技術判断に使うのかを問う written を混ぜる。`;
}

function difficultyRule(count, total, accuracy) {
  if (total < 6) {
    return '- 難易度は basic と intermediate を中心にする。まず基礎の抜けを確かめる。';
  }
  if (accuracy >= 80) {
    return `- 直近の正答率は${accuracy}%（${total}問）と高い。${count}問のうち4問は intermediate か advanced にして、理解を一段深く問う。基礎の確認として basic を1問は入れる。`;
  }
  if (accuracy <= 50) {
    return `- 直近の正答率は${accuracy}%（${total}問）と低い。basic を${Math.max(2, count - 2)}問、intermediate を2問にして、用語の定義と仕組みの理解を固める。`;
  }
  return `- 直近の正答率は${accuracy}%（${total}問）で中くらい。basic を2問、intermediate を3問、advanced を1問の割合にする。`;
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source === 'chat' ? 'chat' : 'topic';
    const genre = String(body.genre || '').slice(0, 10);
    const leaf = String(body.leaf || '').slice(0, 30);
    const count = Math.max(4, Math.min(8, Number(body.count) || 6));
    const leaves = Array.isArray(body.leaves)
      ? body.leaves.map((x) => String(x).slice(0, 30)).filter(Boolean).slice(0, 12)
      : [];

    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (source === 'topic') {
      if (!GENRE_LABEL[genre]) return Response.json({ error: 'unknown genre' }, { status: 400 });
      if (genre !== 'business' && !leaf && leaves.length === 0) {
        return Response.json({ error: 'leaf required' }, { status: 400 });
      }
    }

    const whole = genre !== 'business' && (!leaf || leaf === WHOLE[genre]);
    const prefix = genre === 'business' ? 'business' : `${genre}:`;

    const [existingPage, attemptPage] = await Promise.all([
      base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 200 }),
      source === 'topic' ? base44.entities.KnowledgeAttempt.list({ sort: '-created_date', limit: 150 }) : null,
    ]);

    const existing = (existingPage.items || []).filter((c) =>
      source === 'chat' ? c.source === 'chat' : c.domain && c.domain.startsWith(prefix)
    );
    const existingTexts = existing
      .slice(0, 40)
      .map((c) => (c.text || '').replace(/\s+/g, ' ').slice(0, 60));
    const avoid = existingTexts.length ? `\n\n既存の問題（これらと同じ内容は作らない）:\n- ${existingTexts.join('\n- ')}` : '';

    const attempts = ((attemptPage?.items || []).filter((a) =>
      genre === 'business' ? a.domain === 'business' : (a.domain || '').startsWith(prefix)
    ));
    const correct = attempts.filter((a) => a.correct).length;
    const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;

    let prompt = '';

    if (source === 'chat') {
      const msgPage = await base44.entities.AssistantMessage.filter(
        { created_by_id: user.id },
        { sort: '-created_date', limit: 40 }
      );
      const msgs = (msgPage.items || []).slice().reverse();
      const transcript = msgs
        .map((m) => `${m.role === 'user' ? '利用者' : 'アシスタント'}: ${m.quote ? `（引用「${String(m.quote).slice(0, 200)}」について）` : ''}${(m.content || '').slice(0, 600)}`)
        .join('\n');
      if (transcript.length < 40) {
        return Response.json({ cards: [], reason: '会話がまだ短いため作れませんでした' });
      }

      prompt = `以下は、IT技術者と学習アシスタントのやり取りです。この会話を通じて利用者が学んだと考えられる知識を、知識確認問題にしてください。

${RULES}
- ITの領域から大きく外れない範囲にする。ITそのものでなくても、類推や関連づけが重要で技術の理解や実務判断に効く知識なら含めてよい。
- 会話で実際に扱われた内容だけを問題にする。会話にない知識で水増ししない。
- leaf には、その問題が属する技術領域や話題を短い名詞で入れる（例: Python、TCP/IP、セキュリティ）。
- ${count}問つくる。${avoid}

【会話】
${transcript.slice(0, 12000)}`;
    } else {
      const target =
        genre === 'business'
          ? GENRE_LABEL.business
          : whole
            ? `${GENRE_LABEL[genre]}全般`
            : `${leaf}（${GENRE_LABEL[genre]}）`;

      const leafRule =
        genre === 'business'
          ? '- leaf は必ず "ビジネス" にする。'
          : whole
            ? `- leaf は次のいずれかから選ぶ: ${leaves.join('、')}`
            : `- leaf は必ず "${leaf}" にする。`;

      prompt = `あなたはIT技術者の学習問題を作る出題者です。「${target}」の知識確認問題を${count}問作ってください。

${RULES}
- 対象は「${target}」。この対象から外れた問題は作らない。
${leafRule}
${difficultyRule(count, attempts.length, accuracy)}
- ${count}問のうち少なくとも1問は basic にする。学習が進んでも基礎を時々確かめるため。
${genreRule(genre)}${avoid}`;
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: CARD_SCHEMA,
    });

    const raw = Array.isArray(result?.cards) ? result.cards : [];
    const seen = new Set(existingTexts.map((t) => t.slice(0, 40)));
    const records = [];

    raw.slice(0, count + 2).forEach((c) => {
      const text = String(c?.text || '').trim();
      if (text.length < 12) return;
      const kind = c?.kind === 'written' ? 'written' : 'cloze';
      if (kind === 'cloze' && !text.includes('___')) return;
      if (leaksAnswer(text, { ...c, kind })) return;
      const key = text.replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);

      let cardDomain = 'business';
      if (source === 'chat') {
        cardDomain = `tech:${String(c?.leaf || '会話').slice(0, 20)}`;
      } else if (genre !== 'business') {
        const picked = whole ? String(c?.leaf || '').slice(0, 30) : leaf;
        const safeLeaf = leaves.includes(picked) ? picked : picked || leaves[0] || WHOLE[genre];
        cardDomain = `${genre}:${safeLeaf}`;
      }

      records.push({
        domain: cardDomain,
        topic: String(c?.topic || '').slice(0, 30),
        kind,
        text,
        answer: String(c?.answer || '').slice(0, 200),
        model_answer: kind === 'written' ? String(c?.model_answer || '').slice(0, 800) : '',
        explanation: String(c?.explanation || '').slice(0, 600),
        difficulty: ['basic', 'intermediate', 'advanced'].includes(c?.difficulty) ? c.difficulty : 'basic',
        source: source === 'chat' ? 'chat' : 'ai',
      });
    });

    if (records.length === 0) return Response.json({ cards: [], reason: '作れる問題が見つかりませんでした' });

    const created = await base44.entities.KnowledgeCard.bulkCreate(records);
    return Response.json({ cards: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
