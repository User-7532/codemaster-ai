import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import AssistantPanel from '@/components/assistant/AssistantPanel';

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

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [busy, setBusy] = useState(false);
  const { pathname } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.AssistantMessage.list({ sort: 'created_date', limit: 60 })
      .then((page) => setMessages(page.items.map((m) => ({ id: m.id, role: m.role, content: m.content }))))
      .catch(() => setMessages([]));
  }, []);

  const send = async (raw) => {
    const text = String(raw || '').trim();
    if (!text || busy) return;
    setOpen(true);
    setBusy(true);
    setMessages((prev) => [...(prev || []), { id: `u-${Date.now()}`, role: 'user', content: text }]);
    try {
      const res = await base44.functions.invoke('assistantChat', {
        message: text,
        page: pageLabelOf(pathname),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessages((prev) => [...(prev || []), { id: `a-${Date.now()}`, role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      toast({ title: 'うまく答えられませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-3 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {open && (
        <div className="h-[min(520px,calc(100dvh-13rem))] w-[min(360px,calc(100vw-1.5rem))] rise-in">
          <AssistantPanel messages={messages} busy={busy} onSend={send} onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
        title="学習アシスタントに話しかける"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary/80" />
        {open ? '閉じる' : 'AIに聞く'}
      </button>
    </div>
  );
}