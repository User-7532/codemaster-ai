import { domainLabel } from '@/lib/knowledge-domains';

export default function ClozeCard({ card, revealed, onToggle }) {
  const parts = (card?.text || '').split('___');

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{domainLabel(card.domain)}</span>
        {card.topic && <span className="text-[10px] text-muted-foreground/70">{card.topic}</span>}
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-foreground/90">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <button
                type="button"
                onClick={onToggle}
                className={revealed ? 'cloze-shown mx-0.5 font-medium' : 'cloze-hidden mx-0.5 px-6'}
                aria-label={revealed ? undefined : '空所を開く'}
              >
                {/* 隠しているあいだは答えを画面に出さない（切り替え時に一瞬見えるのを防ぐ） */}
                {revealed ? card.answer : '\u00a0'}
              </button>
            )}
          </span>
        ))}
      </p>

      {revealed ? (
        <div className="mt-4 rounded-lg bg-secondary/40 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{card.explanation || '解説はまだありません'}</p>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-muted-foreground/60">空欄をタップすると答えが見られます</p>
      )}
    </div>
  );
}