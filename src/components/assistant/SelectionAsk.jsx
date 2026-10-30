import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { askAboutSelection } from '@/lib/selection-ask';

const readSelection = () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 2) return null;

  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el || el.closest('input, textarea, [data-no-ask]')) return null;

  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  const above = rect.top > 60;
  return {
    text: text.slice(0, 500),
    top: above ? rect.top - 42 : rect.bottom + 10,
    left: Math.min(Math.max(rect.left + rect.width / 2, 88), window.innerWidth - 88),
  };
};

export default function SelectionAsk() {
  const [tip, setTip] = useState(null);
  const { pathname } = useLocation();
  const wrapRef = useRef(null);

  useEffect(() => {
    const update = () => setTip(readSelection());
    const hide = () => setTip(null);
    const onMouseDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) hide();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('mouseup', update);
    document.addEventListener('touchend', update);
    document.addEventListener('keyup', update);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mouseup', update);
      document.removeEventListener('touchend', update);
      document.removeEventListener('keyup', update);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  useEffect(() => setTip(null), [pathname]);

  if (!tip) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed z-[60] -translate-x-1/2"
      style={{ top: tip.top, left: tip.left }}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          askAboutSelection(tip.text);
          setTip(null);
          window.getSelection()?.removeAllRanges();
        }}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/60 hover:text-primary"
        title="選んだ文章についてアシスタントに聞く"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary/80" />
        これについて質問
      </button>
    </div>
  );
}