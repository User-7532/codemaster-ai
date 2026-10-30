import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DOMAIN_LABEL = {
  ap: '応用情報技術者試験',
  security: '情報処理安全確保支援士（セキスペ）',
  aws: 'AWS認定',
  cisco: 'Cisco（CCNA/CCNP）',
  osi: 'OSI参照モデル',
  cpp: 'C言語・C++',
  python: 'Python',
  global: '海外テック企業（Google・Apple・Amazon・Meta・Microsoftなど）の採用面接',
  business: 'ビジネス・経営・KPI・経済と技術の接点',
};

// ビジネス視点を混ぜる分野。OSIモデルや言語の分野は技術だけに絞る
const BUSINESS_ANGLE = ['ap', 'security', 'aws', 'cisco', 'global', 'business'];

const ANSWER_DOMAINS = ['ap', 'security', 'aws', 'cisco', 'osi', 'cpp', 'python', 'global', 'business'];

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: ANSWER_DOMAINS },
          topic: { type: 'string' },
          kind: { type: 'string', enum: ['cloze', 'written'] },
          text: { type: 'string' },
          answer: { type: 'string' },
          model_answer: { type: 'string' },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['basic', 'intermediate', 'advanced'] },
        },
        required: ['domain', 'topic', 'kind', 'text', 'answer', 'explanation', 'difficulty'],
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
- 1問は短く。冗長な前置きや同じ内容の繰り返しは入れない。`;

function angleRule(domain, count) {
  if (domain === 'global') {
    return `- 海外テック企業の面接で問われる観点を扱う。行動面接（AmazonのLeadership Principles、STAR）、価値観や文化への適合、計算量を実装前に説明する習慣、システムデザイン、曖昧な課題の進め方、英語での説明の組み立てなど。
- 企業名と評価観点の対応は広く知られているものだけを扱い、断定しすぎない。
- ${count}問のうち1〜2問は、技術判断がビジネス指標（KPI、コスト、ユニットエコノミクス）にどう効くかを問う問題にする。`;
  }
  if (domain === 'business') {
    return `- KPI、ユニットエコノミクス（LTV・CAC）、チャーンレート、ROI、TCO、SLA、機会損失、キャッシュフローなど、技術判断がビジネス指標に効く知識を扱う。
- 定義を問う cloze と、なぜその指標を技術判断に使うのかを問う written を混ぜる。`;
  }
  if (BUSINESS_ANGLE.includes(domain)) {
    return `- この分野の試験や面接では、経営・ビジネスとの接点（コスト、機会損失、KPI、ROI、SLA、契約や費用対効果）を問う問題も出る。${count}問のうち1〜2問は、技術の選択がビジネス上の何を左右するかを問う問題にする。
- 残りは、その分野の技術知識そのものを問う問題にする。`;
  }
  return '- ビジネスや経営の話題は出さない。純粋に技術の理解だけを問う。';
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source === 'chat' ? 'chat' : 'topic';
    const domain = String(body.domain || '').slice(0, 20);
    const count = Math.max(4, Math.min(8, Number(body.count) || 6));

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (source === 'topic' && !DOMAIN_LABEL[domain]) {
      return Response.json({ error: 'unknown domain' }, { status: 400 });
    }

    // 同じ問題を繰り返さないため、既存の問題文を渡す
    const existingPage = await base44.entities.KnowledgeCard.list({ sort: '-created_date', limit: 200 });
    const existing = (existingPage.items || []).filter((c) =>
      source === 'chat' ? c.source === 'chat' : c.domain === domain
    );
    const existingTexts = existing.slice(0, 40).map((c) => (c.text || '').replace(/\s+/g, ' ').slice(0, 60));
    const avoid = existingTexts.length ? `\n\n既存の問題（これらと同じ内容は作らない）:\n- ${existingTexts.join('\n- ')}` : '';

    let prompt = '';

    if (source === 'chat') {
      const msgPage = await base44.entities.AssistantMessage.list({ sort: '-created_date', limit: 40 });
      const msgs = (msgPage.items || []).slice().reverse();
      const transcript = msgs
        .map((m) => `${m.role === 'user' ? '利用者' : 'アシスタント'}: ${(m.content || '').slice(0, 600)}`)
        .join('\n');
      if (transcript.length < 40) {
        return Response.json({ cards: [], reason: '会話がまだ短いため作れませんでした' });
      }

      prompt = `以下は、IT技術者と学習アシスタントのやり取りです。この会話を通じて利用者が学んだと考えられる知識を、知識確認問題にしてください。

${RULES}
- ITの領域から大きく外れない範囲にする。ITそのものでなくても、類推や関連づけが重要で技術の理解や実務判断に効く知識なら含めてよい。
- 会話で実際に扱われた内容だけを問題にする。会話にない知識で水増ししない。
- domain は次のどれかを選ぶ: ${ANSWER_DOMAINS.join(', ')}
- ${count}問つくる。${avoid}

【会話】
${transcript.slice(0, 12000)}`;
    } else {
      prompt = `あなたはIT技術者の学習問題を作る出題者です。${DOMAIN_LABEL[domain]}の分野で、短い知識確認問題を${count}問作ってください。

${RULES}
- 対象は${DOMAIN_LABEL[domain]}。この分野から外れた問題は作らない。
- domain は必ず "${domain}" にする。
${angleRule(domain, count)}${avoid}`;
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
      const key = text.replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);
      const cardDomain = source === 'topic' ? domain : ANSWER_DOMAINS.includes(c?.domain) ? c.domain : 'ap';
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