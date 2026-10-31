import { Link } from 'react-router-dom';
import { SkipForward } from 'lucide-react';
import ClozeCard from '@/components/knowledge/ClozeCard';
import WrittenCard from '@/components/knowledge/WrittenCard';

export default function SessionRunner({ session, idx, revealed, onToggle, onAnswer, onSkip, onReset }) {
  const current = session && idx < session.length ? session[idx] : null;

  if (!current) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-center">
        <p className="text-xs text-muted-foreground">セッションはここまでです。</p>
        <button type="button" onClick={onReset} className="mt-3 text-[11px] text-primary hover:underline">
          最初に戻る
        </button>
      </div>
    );
  }

  const isKnowledge = current.type === 'knowledge';
  const isWritten = isKnowledge && current.card.kind === 'written';

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {idx + 1} / {session.length}
        </span>
        <div className="flex items-center gap-2.5">
          <span>{isKnowledge ? '知識' : 'コード'}</span>
          {isKnowledge && !isWritten && (
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center gap-1 text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <SkipForward className="h-3 w-3" /> 飛ばす
            </button>
          )}
        </div>
      </div>

      {isKnowledge ? (
        isWritten ? (
          <div className="mt-3">
            <WrittenCard key={current.card.id} card={current.card} onResult={onAnswer} onSkip={onSkip} />
          </div>
        ) : (
          <>
            <div className="mt-3">
              <ClozeCard card={current.card} revealed={revealed} onToggle={onToggle} />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onAnswer(false)}
                className="flex-1 rounded-lg border border-rose-700/25 bg-rose-500/10 py-2.5 text-[11px] text-rose-700"
              >
                わからなかった
              </button>
              <button
                type="button"
                onClick={() => onAnswer(true)}
                className="flex-1 rounded-lg border border-teal-700/25 bg-teal-500/10 py-2.5 text-[11px] text-teal-700"
              >
                言えた
              </button>
            </div>
          </>
        )
      ) : (
        <div className="mt-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-[13px]">{current.item.title || '復習の問題'}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {current.item.rate !== undefined
              ? `誤答率 ${current.item.rate}%（${current.item.wrong} / ${current.item.total}）`
              : '今日が復習の日です'}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to={`/solve/${current.item.id}?mode=${current.mode || 'review'}`}
              className="flex-1 rounded-lg bg-primary py-2.5 text-center text-[11px] font-medium text-primary-foreground"
            >
              この問題を解く
            </Link>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-lg border border-border/70 px-3 py-2.5 text-[11px] text-muted-foreground"
            >
              飛ばす
            </button>
          </div>
        </div>
      )}
    </div>
  );
}