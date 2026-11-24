import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquarePlus, PenLine, RotateCcw, Send, Timer, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import CodeEditor from '@/components/CodeEditor';
import ProblemBrief from '@/components/workspace/ProblemBrief';
import GradeResult from '@/components/workspace/GradeResult';
import MentorChat from '@/components/workspace/MentorChat';

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// 本番（Track）と同じ画面構成の模擬面接。採点などの中身は Workspace のまま使い、見た目だけ本番型にする。
// アプリの雰囲気（半透明カードで壁紙が透ける）は保つ。
export default function ExamShell({
  problem,
  language,
  onSwitchLanguage,
  code,
  onCode,
  remaining,
  limit,
  grading,
  onSubmit,
  result,
  tracing,
  onTrace,
  onBack,
  explanation,
  onExplanation,
}) {
  const navigate = useNavigate();
  const [explOpen, setExplOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const timed = limit > 0;
  const urgent = timed && remaining < 300;
  const poor = result && result.verdict !== 'correct';

  return (
    <div className="min-h-[calc(100dvh-1px)]">
      {/* 上部バー：タイトル・残り時間・コードの説明・解答を提出 */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/75 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          中断
        </button>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">模擬面接</span>
        <p className="order-last w-full truncate text-center font-display text-sm tracking-tight sm:order-none sm:w-auto sm:flex-1">
          {problem.title}
        </p>
        {timed && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-[12px] ${
              urgent ? 'bg-rose-500/15 text-rose-700' : 'bg-secondary text-foreground/80'
            }`}
          >
            <Timer className="h-3 w-3" />
            残り {mmss(remaining)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExplOpen((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          コードの説明
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={grading}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {grading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {grading ? '採点中…' : '解答を提出する'}
        </button>
      </div>

      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        {/* 左：上限バナー＋問題文 */}
        <aside className="rounded-xl border border-border/60 bg-card/70 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
          <div className="rounded-t-xl border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-800/90">
            メモリ上限(MB): 512 ／ 実行タイムアウト(ms): 2000{timed ? ` ／ 制限時間 ${limit}分` : ''}
          </div>
          <div className="px-4 py-4">
            <ProblemBrief problem={problem} />
          </div>
        </aside>

        {/* 右：言語タブ＋エディタ＋テスト出力 */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onSwitchLanguage(l.id)}
                className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                  language === l.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <CodeEditor value={code} onChange={onCode} language={language} />

          {/* テスト出力（このアプリは実行しないので、サンプル入出力と注意書きを出す） */}
          <div className="overflow-hidden rounded-xl border border-[#2b241c] bg-[#14110d]">
            <div className="flex items-center justify-between border-b border-[#2b241c] px-3 py-1.5">
              <span className="rounded-t bg-[#201a13] px-2 py-0.5 font-mono text-[11px] text-[#c4b8a4]">テスト出力</span>
              <div className="flex items-center gap-1.5">
                <span
                  title="この環境ではコードを実行しません（提出でAIが判定）。実行はあとで対応予定。"
                  className="cursor-not-allowed rounded border border-[#2b241c] px-2 py-0.5 text-[10px] text-[#6f6554]"
                >
                  実行と保存
                </span>
                <span
                  title="この環境ではコードを実行しません（提出でAIが判定）。実行はあとで対応予定。"
                  className="cursor-not-allowed rounded border border-[#2b241c] px-2 py-0.5 text-[10px] text-[#6f6554]"
                >
                  デバッグ
                </span>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-[#cbbfa9]">
              {(problem.test_cases || []).length > 0 ? (
                <div className="space-y-2">
                  {(problem.test_cases || []).map((t, i) => (
                    <div key={i}>
                      <div className="text-[#8b7f6d]">&gt; 入力: {t.input || '(なし)'}</div>
                      <div className="text-[#b9d98f]">期待: {t.expected || '-'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#8b7f6d]">サンプル入出力は用意されていません。</p>
              )}
              <p className="mt-3 border-t border-[#2b241c] pt-2 text-[10.5px] text-[#6f6554]">
                ※ この環境ではコードを実行しません。「解答を提出する」とAIがコードを読んで判定します（実行はあとで対応予定）。
              </p>
            </div>
          </div>

          {/* 採点結果 → 復習・写経への導線 */}
          {result && (
            <>
              <GradeResult result={result} onOpenMentor={() => setMentorOpen(true)} />

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
                <span className="text-[11px] text-muted-foreground">
                  {poor ? '今回は手応えが薄め。' : 'よく書けました。'}復習に追加済み。
                </span>
                {poor && (
                  <button
                    type="button"
                    onClick={onTrace}
                    disabled={tracing || grading}
                    title="この問題の模範解答をお手本に写経して、書き方を体に入れる"
                    className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-[11px] text-primary transition-colors hover:bg-primary/25 disabled:opacity-60"
                  >
                    {tracing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                    {tracing ? 'お手本を作っています…' : '写経で書き方を固める'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/review')}
                  className="rounded-lg border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  復習へ
                </button>
                {!poor && (
                  <button
                    type="button"
                    onClick={onTrace}
                    disabled={tracing || grading}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                    title="この問題の模範解答を写経する"
                  >
                    <PenLine className="h-3 w-3" />
                    写経する
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/interview')}
                  className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  もう一本
                </button>
              </div>

              {mentorOpen && <MentorChat problemId={problem.id} lastResult={result} />}
            </>
          )}
        </section>
      </div>

      {/* コードの説明（方針を言葉にする）スライドパネル */}
      {explOpen && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/20" onClick={() => setExplOpen(false)}>
          <aside
            className="h-full w-[min(380px,100vw)] overflow-y-auto border-l border-border/60 bg-card/95 p-4 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">コードの説明</p>
              <button
                type="button"
                onClick={() => setExplOpen(false)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              解く前・解いたあとに、方針を自分の言葉で書いてみてください。「方針は出るのに書けない」を埋める練習になります。
            </p>
            <textarea
              value={explanation}
              onChange={(e) => onExplanation(e.target.value)}
              rows={16}
              placeholder="例）入力を1行ずつ読んで、座標を更新していく。MOVEのときは…"
              className="mt-3 w-full resize-y rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus:border-primary/50"
            />
          </aside>
        </div>
      )}
    </div>
  );
}
