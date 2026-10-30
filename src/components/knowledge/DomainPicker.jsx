import { useState } from 'react';
import { Plus } from 'lucide-react';
import { GENRES, WHOLE_LABEL } from '@/lib/knowledge-domains';

export default function DomainPicker({ genre, leaf, customs = [], onGenre, onLeaf, onAddCustom }) {
  const [draft, setDraft] = useState('');

  const active = GENRES.find((g) => g.id === genre);
  const subs = active?.subs || [];
  const extra = customs
    .filter((c) => c.genre === genre)
    .map((c) => c.name)
    .filter((n) => !subs.includes(n));

  const submit = () => {
    const name = draft.trim().slice(0, 30);
    if (!name) return;
    onAddCustom(genre, name);
    setDraft('');
  };

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onGenre(g.id)}
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              genre === g.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {active?.subs && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
          {[...subs, ...extra].map((s) => {
            const whole = s === WHOLE_LABEL[genre];
            const selected = whole ? !leaf || leaf === s : leaf === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onLeaf(s)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                  selected
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            );
          })}

          <span className="ml-1 flex items-center gap-1 rounded-full border border-border/70 pl-2 pr-0.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={30}
              placeholder={active.hint}
              className="w-24 bg-transparent py-0.5 text-[11px] outline-none placeholder:text-muted-foreground/60 sm:w-32"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
              title="この候補を追加する"
            >
              <Plus className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}