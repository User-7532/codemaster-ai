import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquarePlus, PenLine, RotateCcw, Send, Timer, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import CodeEditor from '@/components/CodeEditor';
import GradeResult from '@/components/workspace/GradeResult';
import MentorChat from '@/components/workspace/MentorChat';

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const DIFF = { basic: '基礎', intermediate: '中級', advanced: '上級' };

// 本番（Track等、世界的なコード面接）と同じ画面構成の模擬面接。
// アプリの柔らかい雰囲気ではなく、壁紙も隠した「試験環境」らしい硬い見た目にする（全画面・不透明）。
// 採点などの中身は Workspace のまま使う。
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
  const cases = problem.test_cases || [];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-100 text-slate-800">
      {/* 上部バー */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          中断
        </button>
        <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-400">模擬面接</span>
        <p className="order-last w-full truncate text-center text-sm font-semibold tracking-tight text-slate-900 sm:order-none sm:w-auto sm:flex-1">
          {problem.title}
        </p>
        {timed && (
          <span
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[12px] tabular-nums ${
              urgent ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Timer className="h-3 w-3" />
            残り {mmss(remaining)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExplOpen((v) => !v)}
          className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          コードの説明
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={grading}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {grading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {grading ? '採点中…' : '解答を提出する'}
        </button>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* 左：上限バナー＋問題文（白パネル） */}
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-700">
            メモリ上限(MB): 512 ／ 実行タイムアウト(ms): 2000{timed ? ` ／ 制限時間 ${limit}分` : ''}
          </div>
          <div className="px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500">
                {DIFF[problem.difficulty] || problem.difficulty || '—'}
              </span>
              {(problem.topics || []).map((t) => (
                <span key={t} className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900">{problem.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{problem.statement}</p>

            {problem.constraints && (
              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">制約</p>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{problem.constraints}</p>
              </div>
            )}

            {cases.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">サンプル入出力</p>
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left font-normal">入力</th>
                        <th className="px-2.5 py-1.5 text-left font-normal">期待する出力</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {cases.map((t, i) => (
                        <tr key={i} className="align-top">
                          <td className="px-2.5 py-1.5 text-slate-700">{t.input || '-'}</td>
                          <td className="px-2.5 py-1.5 text-emerald-600">{t.expected || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {problem.expected_complexity && (
              <p className="mt-5 text-[11px] text-slate-500">
                想定の計算量：<span className="font-mono text-slate-700">{problem.expected_complexity}</span>
              </p>
            )}
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
                className={`rounded px-3 py-1 text-[11px] transition-colors ${
                  language === l.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <CodeEditor value={code} onChange={onCode} language={language} />

          {/* テスト出力（実行はしないので、サンプル入出力と注意書き） */}
          <div className="overflow-hidden rounded-lg border border-[#2b241c] bg-[#14110d]">
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
              {cases.length > 0 ? (
                <div className="space-y-2">
                  {cases.map((t, i) => (
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
              <div className="rounded-lg border border-slate-200 bg-white p-1">
                <GradeResult result={result} onOpenMentor={() => setMentorOpen(true)} />
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <span className="text-[11px] text-slate-500">
                  {poor ? '今回は手応えが薄め。' : 'よく書けました。'}復習に追加済み。
                </span>
                {poor && (
                  <button
                    type="button"
                    onClick={onTrace}
                    disabled={tracing || grading}
                    title="この問題の模範解答をお手本に写経して、書き方を体に入れる"
                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[11px] text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {tracing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                    {tracing ? 'お手本を作っています…' : '写経で書き方を固める'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/review')}
                  className="rounded border border-slate-300 px-3 py-1.5 text-[11px] text-slate-600 transition-colors hover:bg-slate-50"
                >
                  復習へ
                </button>
                {!poor && (
                  <button
                    type="button"
                    onClick={onTrace}
                    disabled={tracing || grading}
                    className="flex items-center gap-1 text-[11px] text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-60"
                    title="この問題の模範解答を写経する"
                  >
                    <PenLine className="h-3 w-3" />
                    写経する
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/interview')}
                  className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 transition-colors hover:text-slate-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  もう一本
                </button>
              </div>

              {mentorOpen && (
                <div className="rounded-lg border border-slate-200 bg-white p-1">
                  <MentorChat problemId={problem.id} lastResult={result} />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* コードの説明（方針を言葉にする）スライドパネル */}
      {explOpen && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setExplOpen(false)}>
          <aside
            className="h-full w-[min(380px,100vw)] overflow-y-auto border-l border-slate-200 bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">コードの説明</p>
              <button
                type="button"
                onClick={() => setExplOpen(false)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              解く前・解いたあとに、方針を自分の言葉で書いてみてください。「方針は出るのに書けない」を埋める練習になります。
            </p>
            <textarea
              value={explanation}
              onChange={(e) => onExplanation(e.target.value)}
              rows={16}
              placeholder="例）入力を1行ずつ読んで、座標を更新していく。MOVEのときは…"
              className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-800 outline-none focus:border-blue-400"
            />
          </aside>
        </div>
      )}
    </div>
  );
}
