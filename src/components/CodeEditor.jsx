import { useMemo } from 'react';
import { highlight } from '@/lib/highlight';
import { languageFilename } from '@/lib/languages';

export default function CodeEditor({ value = '', onChange, language = 'cpp', minRows = 16 }) {
  const html = useMemo(() => highlight(value, language), [value, language]);
  const lineCount = Math.max(1, value.split('\n').length);
  const rows = Math.max(minRows, lineCount + 1);

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const next = `${value.slice(0, start)}  ${value.slice(el.selectionEnd)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2b241c] bg-[#14110d] shadow-[0_2px_18px_-8px_rgba(52,44,36,0.5)]">
      <div className="flex items-center gap-2 border-b border-[#2b241c] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#c2603f]" />
        <span className="font-mono text-[11px] text-[#a89a86]">{languageFilename(language)}</span>
      </div>
      <div className="flex max-h-[62vh] overflow-y-auto">
        <div
          aria-hidden
          className="select-none border-r border-[#2b241c] px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-[#5f5548]"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre
            aria-hidden
            className="pointer-events-none absolute inset-0 whitespace-pre-wrap px-3 py-3 font-mono text-[13px] leading-6 [overflow-wrap:anywhere]"
            dangerouslySetInnerHTML={{ __html: `${html}\n` }}
          />
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="relative w-full resize-none whitespace-pre-wrap bg-transparent px-3 py-3 font-mono text-[13px] leading-6 text-transparent caret-[#f1b6a2] outline-none [overflow-wrap:anywhere]"
          />
        </div>
      </div>
    </div>
  );
}