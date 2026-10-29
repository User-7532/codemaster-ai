import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_CODE = 60000;

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title = 'solution', code = '', language = 'cpp' } = body;
    if (typeof code !== 'string' || !code.trim()) return Response.json({ error: 'コードが空です' }, { status: 400 });
    if (code.length > MAX_CODE) return Response.json({ error: 'コードが長すぎます' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    const conn = await base44.asServiceRole.connectors.getConnection('github').catch(() => null);
    if (!conn || !conn.accessToken) {
      return Response.json({ connected: false, message: 'GitHub連携がまだ接続されていません' });
    }

    const safeName = String(title).replace(/[^\w\-.\u3040-\u30ff\u4e00-\u9faf]+/g, '_').slice(0, 60) || 'solution';
    const filename = `${safeName}.${language === 'python' ? 'py' : 'cpp'}`;

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `CodeDojo: ${title}`,
        public: false,
        files: { [filename]: { content: code } },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ connected: true, error: `GitHub送信に失敗しました (${res.status}) ${detail.slice(0, 200)}` }, { status: 502 });
    }

    const gist = await res.json();
    return Response.json({ connected: true, url: gist.html_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}