import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Timer, Github, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { LANGUAGES, getTemplate, fallbackTemplate } from '@/lib/languages';
import { recordReview } from '@/lib/srs';
import CodeEditor from '@/components/CodeEditor';
import ProblemBrief from '@/components/workspace/ProblemBrief';
import HintBox from '@/components/workspace/HintBox';
import GradeResult from '@/components/workspace/GradeResult';
import MentorChat from '@/components/workspace/MentorChat';

const MODE_LABEL = { interview: '模擬面接', review: '復習', ai: 'AI出題', mixed: '混在', practice: '練習' };

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function Workspace() {
  const { problemId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'practice';
  const limit = Number(searchParams.get('limit') || 0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [problem, setProblem] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [hints, setHints] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gisting, setGisting] = useState(false);
  const [result, setResult] = useState(null);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [remaining, setRemaining] = useState(limit * 60);
  const startedAt = useRef(Date.now());
  const autoSubmitted = useRef(false);

  useEffect(() => {
    base44.entities.Problem.get(problemId)
      .then((p) => {
        setProblem(p);
        const lang = (p.templates || []).some((t) => t.language === 'cpp') ? 'cpp' : p.templates?.[0]?.language || 'cpp';
        setLanguage(lang);
        setCode(getTemplate(p, lang) || fallbackTemplate(lang));
      })
      .catch(() => setLoadFailed(true));
  }, [problemId]);

  useEffect(() => {
    if (mode !== 'interview' || limit <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [mode, limit]);

  const duration = () =>
    mode === 'interview' && limit > 0 ? limit * 60 - remaining : Math.round((Date.now() - startedAt.current) / 1000);

  const handleGrade = async (auto = false) => {
    if (grading || !problem) return;
    if (!code.trim()) {
      toast({ title: 'コードが空です', description: '何か書いてから採点してください' });
      return;
    }
    setGrading(true);
    try {
      const res = await base44.functions.invoke('gradeSubmission', {
        problem_id: problem.id,
        language,
        mode,
        duration_seconds: duration(),
        code,
      });
      if (res.data?.error) throw new Error(res.data.error);
      const r = res.data.result;
      setResult(r);
      setMentorOpen(r.verdict !== 'correct');
      if (auto) toast({ title: '時間切れ', description: '書けているところまでで採点しました' });
      recordReview({
        item_type: 'problem',
        item_id: problem.id,
        title: problem.title,
        topic: (problem.topics || [])[0] || '未分類',
        correct: r.verdict === 'correct',
      }).catch(() => {});
      requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    } catch (e) {
      toast({ title: '採点できませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'interview' || limit <= 0 || remaining > 0 || result || autoSubmitted.current || !problem) return;
    autoSubmitted.current = true;
    handleGrade(true);
  }, [remaining, mode, limit, result, problem]);

  const revealHint = async () => {
    if (hintLoading || !problem) return;
    setHintLoading(true);
    try {
      const res = await base44.functions.invoke('generateHint', {
        problem_id: problem.id,
        level: hints.length + 1,
        code,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setHints((h) => [...h, res.data.hint]);
    } catch (e) {
      toast({ title: 'ヒントを出せませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setHintLoading(false);
    }
  };

  const sendToGist = async () => {
    setGisting(true);
    try {
      const res = await base44.functions.invoke('exportGist', { title: problem.title, code, language });
      if (res.data?.error) throw new Error(res.data.error);
      if (!res.data?.connected) {
        toast({ title: 'まだ保存できません', description: 'GitHubの準備ができていません。少し待ってからもう一度お試しください' });
        return;
      }
      window.open(res.data.url, '_blank');
      toast({ title: 'GitHubに保存しました', description: '書いたコードはいつでも見返せます' });
    } catch (e) {
      toast({ title: 'GitHubに送れませんでした', description: e.message, variant: 'destructive' });
    } finally {
      setGisting(false);
    }
  };

  const switchLanguage = (next) => {
    if (next === language || !problem) return;
    const currentTemplates = (problem.templates || []).map((t) => t.code);
    const pristine = !code.trim() || currentTemplates.includes(code);
    if (!pristine && !window.confirm('言語を切り替えるとコードは初期状態に戻ります。よろしいですか？')) return;
    setLanguage(next);
    setCode(getTemplate(problem, next) || fallbackTemplate(next));
    setResult(null);
  };

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">この問題は見つかりませんでした。</p>
        <Link to="/curriculum" className="mt-4 inline-block text-xs text-primary hover:underline">
          問題一覧に戻る
        </Link>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const urgent = mode === 'interview' && remaining < 300;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/curriculum')}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          問題一覧
        </button>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
          {MODE_LABEL[mode] || '練習'}
        </span>
        {mode === 'interview' && limit > 0 && (
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-[11px] ${
              urgent ? 'bg-rose-500/15 text-rose-700' : 'bg-secondary text-foreground/80'
            }`}
          >
            <Timer className="h-3 w-3" />
            {mmss(remaining)}
          </span>
        )}
        <button
          type="button"
          onClick={sendToGist}
          disabled={gisting}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          title="書いたコードをGitHubに保存する"
        >
          {gisting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
          {gisting ? '保存中…' : 'コードを保存'}
        </button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <aside className="hidden rounded-xl border border-border/60 bg-card/60 p-5 lg:sticky lg:top-5 lg:block lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto">
          <ProblemBrief problem={problem} />
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/70 lg:hidden">
            <button
              type="button"
              onClick={() => setBriefOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs text-foreground"
            >
              <span className="font-medium">問題文を読む</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${briefOpen ? 'rotate-180' : ''}`} />
            </button>
            {briefOpen && (
              <div className="border-t border-border/60 px-4 py-4">
                <ProblemBrief problem={problem} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => switchLanguage(l.id)}
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

          <CodeEditor value={code} onChange={setCode} language={language} />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleGrade(false)}
              disabled={grading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {grading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {grading ? 'AIが採点中…' : '採点する'}
            </button>
            {result && (
              <button
                type="button"
                onClick={() => setMentorOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-border/70 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {mentorOpen ? 'メンターを閉じる' : 'AIメンターと話す'}
                <ChevronDown className={`h-3 w-3 transition-transform ${mentorOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {result && (
              <Link to="/curriculum" className="text-[11px] text-muted-foreground hover:text-foreground">
                次の問題へ
              </Link>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground/60">サーバーでは実行しません（AIがコードを読んで判定）</span>
          </div>

          <HintBox hints={hints} loading={hintLoading} onReveal={revealHint} disabled={grading} />

          <GradeResult result={result} onOpenMentor={() => setMentorOpen(true)} />

          {result && mentorOpen && (
            <MentorChat problemId={problem.id} lastResult={result} />
          )}
        </section>
      </div>
    </div>
  );
}