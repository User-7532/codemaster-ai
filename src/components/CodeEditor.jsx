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
    <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0a0c10]">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-primary/70" />
        <span className="font-mono text-[11px] text-muted-foreground">{languageFilename(language)}</span>
      </div>
      <div className="flex max-h-[62vh] overflow-y-auto">
        <div
          aria-hidden
          className="select-none border-r border-border/30 px-2.5 py-3 text-right font-mono text-[12px] leading-6 text-muted-foreground/35"
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
            className="relative w-full resize-none whitespace-pre-wrap bg-transparent px-3 py-3 font-mono text-[13px] leading-6 text-transparent caret-primary outline-none [overflow-wrap:anywhere]"
          />
        </div>
      </div>
    </div>
  );
}