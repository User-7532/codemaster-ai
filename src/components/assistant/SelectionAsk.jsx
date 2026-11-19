import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { askAboutSelection, codeAskContext } from '@/lib/selection-ask';

// 黒いコード入力欄の中で選んだ部分（入力欄の選択は、ふつうの選択とは別に取る）
let measureCtx = null;
const charWidth = (el) => {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  const cs = getComputedStyle(el);
  measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
  return measureCtx.measureText('0').width || 7.8;
};
const readCodeSelection = () => {
  const el = document.activeElement;
  if (!el || el.tagName !== 'TEXTAREA' || el.dataset.askCode === undefined) return null;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value.slice(start, end);
  if (!text.trim()) return null;
  const before = el.value.slice(0, start).split('\n');
  const row = before.length - 1;
  const col = before[row].length;
  const cs = getComputedStyle(el);
  const lineH = parseFloat(cs.lineHeight) || 24;
  const padTop = parseFloat(cs.paddingTop) || 12;
  const padLeft = parseFloat(cs.paddingLeft) || 12;
  const rect = el.getBoundingClientRect();
  const y = rect.top + padTop + row * lineH;
  const x = rect.left + padLeft + col * charWidth(el);
  const above = y > 60;
  return {
    text: text.slice(0, 500),
    context: codeAskContext(el, start, end),
    code: el,
    top: above ? y - 40 : y + lineH + 8,
    left: Math.min(Math.max(x + 40, 88), window.innerWidth - 88),
  };
};

const readSelection = () => {
  const inCode = readCodeSelection();
  if (inCode) return inCode;
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
    // スマホでは、入力欄の中の選択は指を離したあとに広げたり縮めたりできるので、選択の変化でも出し直す
    let timer = null;
    const onSelChange = () => {
      const el = document.activeElement;
      if (!el || el.tagName !== 'TEXTAREA' || el.dataset.askCode === undefined) return;
      clearTimeout(timer);
      timer = setTimeout(() => setTip(readSelection()), 250);
    };
    document.addEventListener('selectionchange', onSelChange);
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
      clearTimeout(timer);
      document.removeEventListener('selectionchange', onSelChange);
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
          askAboutSelection(tip.text, tip.context);
          setTip(null);
          if (tip.code) tip.code.selectionStart = tip.code.selectionEnd = tip.code.selectionEnd;
          else window.getSelection()?.removeAllRanges();
        }}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/60 hover:text-primary"
        title="選んだところについてアシスタントに聞く"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary/80" />
        これについて質問
      </button>
    </div>
  );
}