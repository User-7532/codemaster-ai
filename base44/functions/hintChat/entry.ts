import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const LANG_LABEL = { python: 'Python', c: 'C', cpp: 'C++' };
const LANG_NOTES = {
  python: 'Python 3。リスト、辞書、内包表記、スライスなどの標準的な書き方を使う。',
  c: 'C言語（C99以降）。C++専用の機能は使わない。<stdio.h>・<stdlib.h>・<string.h> と malloc/free で書く。',
  cpp: 'C++17。std::vector、std::string、std::sort などの標準ライブラリを使ってよい。',
};

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const problemId = String(body.problem_id || '');
    const language = ['cpp', 'c', 'python'].includes(body.language) ? body.language : 'cpp';
    const code = String(body.code || '').slice(0, 4000);
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];

    if (!problemId) return Response.json({ error: 'problem_id is required' }, { status: 400 });
    const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
    if (!lastUser || !String(lastUser.content || '').trim()) {
      return Response.json({ error: 'メッセージを入力してください' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const problem = await base44.entities.Problem.get(problemId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!problem) return Response.json({ error: 'Problem not found' }, { status: 404 });

    const conversation = messages
      .map((m) => `${m.role === 'user' ? '学習者' : 'あなた'}: ${String(m.content || '').slice(0, 800)}`)
      .join('\n');

    const prompt = `あなたは「CodeMaster AI」のプログラミング質問窓口です。学習者が、文法・語彙・標準ライブラリの書き方が分からず手が止まっています。そこだけを具体的に助けてください。

【使用言語】${LANG_LABEL[language]}
【言語の前提】${LANG_NOTES[language]}

【いま解いている問題（参考）】
${problem.title}
${String(problem.statement || '').slice(0, 1200)}

【学習者の現在のコード】
\`\`\`
${code || '(まだ何も書かれていない)'}
\`\`\`

【これまでのやりとり（古い順）】
${conversation}

答え方のルール:
- 文法・語彙・標準ライブラリの使い方の質問には、その言語で実際に動く最小限のコード例（1〜8行）を添えて具体的に答える。例は質問に必要な部分だけを抜き出し、問題の答えそのものは書かない。
- 問題の解法（どう解くか、どんなアルゴリズムか）を聞かれた場合は、解法は教えない。ヒント欄の3段階のヒントを見るよう短く促し、そのうえで文法面の手助けができることを1文で示す。
- 学習者のコードに文法ミスや未定義の関数があれば、該当箇所を引用して直し方を示す。
- 標準ライブラリや関数名は実在するものを正確に書く。不確かなものは書かない。
- 読みやすい簡潔な日本語。専門用語は正確な標準用語で書き、比喩や曖昧な言い換えをしない。
- 前置きや定型の締め（「いい質問ですね」「頑張ってください」など）は書かない。コード例のあとに補足が要るときだけ1〜2文添える。
- 記号の装飾（アスタリスクや見出し記号）は使わない。`;

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ reply: String(reply || '').trim() || 'うまく答えを作れませんでした。もう一度聞いてください。' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}