import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 最初の画面には戻り先がないので出さない
  if (pathname === '/') return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <button
      type="button"
      onClick={goBack}
      title="前の画面に戻る"
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
    >
      <ArrowLeft className="h-3 w-3" /> 戻る
    </button>
  );
}