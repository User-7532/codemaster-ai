import { useEffect, useRef, useState } from 'react';

// 左右2つのパネルを、境界をドラッグして幅を変えられる分割ビュー。
// 幅は localStorage に覚える。狭い画面（lg 未満）では縦に積む。
export default function SplitPane({ left, right, storageKey = 'cm-split', min = 260, initial = 440 }) {
  const ref = useRef(null);
  const [isLg, setIsLg] = useState(false);
  const [w, setW] = useState(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      return v >= min ? v : initial;
    } catch {
      return initial;
    }
  });
  const wRef = useRef(w);
  wRef.current = w;
  const dragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsLg(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current || !ref.current) return;
      if (e.cancelable) e.preventDefault();
      const rect = ref.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      setW(Math.max(min, Math.min(rect.width - min, cx - rect.left)));
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(storageKey, String(Math.round(wRef.current)));
      } catch {
        // 覚えられなくても動く
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [storageKey, min]);

  const start = (e) => {
    dragging.current = true;
    document.body.style.userSelect = 'none';
    if (e.cancelable) e.preventDefault();
  };

  if (!isLg) {
    return (
      <div className="space-y-3">
        {left}
        {right}
      </div>
    );
  }

  return (
    <div ref={ref} className="flex items-start">
      <div style={{ width: w }} className="shrink-0">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={start}
        onTouchStart={start}
        title="ドラッグで幅を変える"
        className="group flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center self-stretch"
      >
        <div className="h-16 w-1 rounded-full bg-border transition-colors group-hover:bg-primary/60" />
      </div>
      <div className="min-w-0 flex-1">{right}</div>
    </div>
  );
}
