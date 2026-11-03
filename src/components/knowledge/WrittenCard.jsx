import { useState } from 'react';
import { Check, Loader2, Mic, MicOff, SkipForward, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { domainLabel } from '@/lib/knowledge-domains';
import { revealsAnswer } from '@/lib/answer-guard';
import useSpeechInput from '@/hooks/use-speech-input';

export default function WrittenCard({ card, onResult, onSkip }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');
  const speech = useSpeechInput({ onText: (t) => setDraft((d) => d + t) });

  const judge = async () => {
    if (!draft.trim() || busy) return;
    speech.stop();
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('judgeKnowledgeAnswer', {
        card_id: card.id,
        answer_text: draft.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setVerdict({ correct: res.data.correct === true, feedback: res.data.feedback || '' });
    } catch (e) {
      setError(e.message || '判定できませんでした');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
          {!verdict && revealsAnswer(domainLabel(card.domain), card) ? '知識' : domainLabel(card.domain)}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">記述</span>
        {/* 話題名は答えの手がかりになりやすいので、判定が出てから出す */}
        {verdict && card.topic && <span className="truncate text-[10px] text-muted-foreground/70">{card.topic}</span>}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <SkipForward className="h-3 w-3" /> 飛ばす
          </button>
        )}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/90">{card.text}</p>

      {verdict ? (
        <div className="mt-4 space-y-2.5">
          <p
            className={`flex items-center gap-1.5 text-[12px] font-medium ${
              verdict.correct ? 'text-teal-700' : 'text-rose-700'
            }`}
          >
            {verdict.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {verdict.correct ? '正解' : '不正解'}
          </p>
          <p className="text-[11.5px] leading-relaxed text-foreground/80">{verdict.feedback}</p>
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
            {card.expected_points?.length > 0 && (
              <div className="mb-2.5">
                <p className="text-[10px] text-muted-foreground">採点の観点</p>
                <ul className="mt-1 space-y-0.5">
                  {card.expected_points.map((p, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="shrink-0">・</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">模範解答</p>
            <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-foreground">
              {card.model_answer || card.answer}
            </p>
            {card.explanation && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">{card.explanation}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onResult(verdict.correct)}
            className="w-full rounded-lg bg-primary py-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            次へ
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={speech.toggle}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                speech.listening
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {speech.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {speech.listening ? '音声を止める' : '音声で入力'}
            </button>
            {speech.listening && (
              <span className="flex items-center gap-1 text-[10px] text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> 聞き取り中
              </span>
            )}
          </div>
          {speech.error && <p className="mt-1.5 text-[10px] text-rose-700">{speech.error}</p>}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // 変換中のEnterは送信せず、確定に使う
              if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              judge();
            }}
            rows={4}
            maxLength={2000}
            placeholder="問題文で求められた要素を、示された数だけ書いてください。"
            className="mt-2 w-full resize-y rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus:border-primary/50"
          />
          {speech.interim && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/70">…{speech.interim}</p>
          )}
          {error && <p className="mt-2 text-[11px] text-rose-700">{error}</p>}
          <button
            type="button"
            onClick={judge}
            disabled={busy || !draft.trim()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'AIが判定中…' : '判定する'}
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">
            あいまいな答えは不正解として扱います。Enterで送信、Shift+Enterで改行します。急ぐときは「飛ばす」で先へ進めます。
          </p>
        </>
      )}
    </div>
  );
}