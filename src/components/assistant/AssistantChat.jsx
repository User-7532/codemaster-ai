import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import AssistantPanel from '@/components/assistant/AssistantPanel';
import useDragPosition from '@/hooks/use-drag-position';
import { onAskSelection } from '@/lib/selection-ask';
import { importExternal, importReport } from '@/lib/external-import';
import { signedUrls } from '@/lib/attachments';

const PAGE_LABEL = {
  '/': 'ダッシュボード',
  '/curriculum': 'カリキュラム',
  '/generate': 'AI出題',
  '/interview': '模擬面接',
  '/knowledge': '知識モード',
  '/review': '復習',
  '/stats': '弱点分析',
  '/appearance': '見た目設定',
};

const pageLabelOf = (pathname) => {
  if (pathname.startsWith('/solve/')) return '問題を解く画面';
  return PAGE_LABEL[pathname] || pathname;
};

// いま画面に出ている文字だけを軽く取り出して、会話の文脈にする
const visibleContext = () => {
  const main = document.querySelector('main');
  const text = (main?.innerText || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.slice(0, 1500);
};

const toMessage = (m) => ({ id: m.id, role: m.role, content: m.content, quote: m.quote || '', images: m.images || [], created_date: m.created_date });

// 古い順に並べる。質問と返事は同じ時刻で保存されるので、同時刻はIDの順（質問が先）にする
const byTime = (a, b) =>
  String(a.created_date || '').localeCompare(String(b.created_date || '')) || String(a.id).localeCompare(String(b.id));

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState('');
  const [importing, setImporting] = useState(false);
  const { pathname } = useLocation();
  const { toast } = useToast();
  const drag = useDragPosition();

  useEffect(() => {
    // 新しいほうから60件を取り、古い順に並べ直して表示する
    base44.entities.AssistantMessage.list({ sort: '-created_date', limit: 60 })
      .then((page) => setMessages(page.items.map(toMessage).sort(byTime)))
      .catch(() => setMessages([]));
  }, []);

  // 検索で選んだ発言がまだ読み込まれていないとき、その発言から最新までを読み込む
  const loadFrom = async (iso) => {
    try {
      const page = await base44.entities.AssistantMessage.filter(
        { created_date: { $gte: iso } },
        { sort: 'created_date', limit: 500 }
      );
      const saved = page.items.map(toMessage);
      setMessages((prev) => {
        // 送ったばかりでまだ保存されていない発言は残す
        const unsaved = (prev || []).filter(
          (m) => /^[ua]-/.test(String(m.id)) && !saved.some((s) => s.role === m.role && s.content === m.content)
        );
        return [...saved.sort(byTime), ...unsaved];
      });
    } catch (e) {
      toast({ title: '会話を読み込めませんでした', description: e.message, variant: 'destructive' });
    }
  };

  // 画面で選んだ文章を受け取り、引用つきの質問として開く
  useEffect(
    () =>
      onAskSelection((text) => {
        setQuote(text);
        setOpen(true);
      }),
    []
  );

  const send = async (raw, imgs = []) => {
    const uris = imgs.map((i) => i.uri);
    // 画像だけを送ったときは、画像について聞いたことにする
    const text = String(raw || '').trim() || (uris.length ? 'この画像について教えて' : '');
    if (!text || busy) return;
    const currentQuote = quote;
    setOpen(true);
    setBusy(true);
    setQuote('');
    setMessages((prev) => [...(prev || []), { id: `u-${Date.now()}`, role: 'user', content: text, quote: currentQuote, images: uris, previews: imgs.map((i) => i.preview) }]);
    try {
      // 画像は、AIが読める期限つきのURLにして渡す（保存するのは保存先の場所だけ）
      const imageUrls = uris.length ? await signedUrls(uris) : [];
      const res = await base44.functions.invoke('assistantChat', {
        message: text,
        images: imageUrls,
        image_uris: uris,
        quote: currentQuote,
        page: pageLabelOf(pathname),
        path: pathname,
        context: visibleContext(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessages((prev) => [...(prev || []), { id: `a-${Date.now()}`, role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      toast({ title: 'うまく答えられませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // 入力欄に貼った、ほかのAIとの会話を取り込む。結果は会話にも残す
  const runImport = async (raw, imgs = []) => {
    const text = String(raw || '').trim();
    const uris = imgs.map((i) => i.uri);
    if ((!text && !uris.length) || busy) return;
    const label = `ほかのAIとの会話を取り込む（${[text ? `${text.length.toLocaleString()}字` : '', uris.length ? `画像${uris.length}枚` : ''].filter(Boolean).join('・')}）`;
    setOpen(true);
    setBusy(true);
    setImporting(true);
    setMessages((prev) => [...(prev || []), { id: `u-${Date.now()}`, role: 'user', content: label, images: uris, previews: imgs.map((i) => i.preview) }]);
    try {
      const result = await importExternal(text, uris);
      const report = importReport(result);
      setMessages((prev) => [...(prev || []), { id: `a-${Date.now()}`, role: 'assistant', content: report }]);
      base44.entities.AssistantMessage.bulkCreate([
        { role: 'user', content: label, images: uris },
        { role: 'assistant', content: report },
      ]).catch(() => {});
    } catch (e) {
      toast({ title: '取り込めませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      setImporting(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-24 right-3 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {open && (
        <div
          ref={drag.ref}
          className="pointer-events-auto relative z-10 h-[min(520px,calc(100dvh-13rem))] w-[min(360px,calc(100vw-1.5rem))]"
          style={{ transform: `translate3d(${drag.offset.x}px, ${drag.offset.y}px, 0)` }}
        >
          <AssistantPanel
            messages={messages}
            busy={busy}
            onSend={send}
            onImport={runImport}
            importing={importing}
            onClose={() => setOpen(false)}
            onLoadFrom={loadFrom}
            quote={quote}
            onClearQuote={() => setQuote('')}
            onQuote={setQuote}
            dragProps={drag.dragProps}
            dragging={drag.dragging}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-card/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
        title="学習アシスタントに話しかける"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary/80" />
        {open ? '閉じる' : 'AIに聞く'}
      </button>
    </div>
  );
}