import useAppearance from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function BrandLogo({ className }) {
  const [settings] = useAppearance();
  const text = String(settings.logoText || '').trim() || 'CodeMaster';
  const words = text.split(/\s+/);

  return (
    <span className={cn('font-brand tracking-tight text-foreground', className)}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className={cn(words.length > 1 && i === words.length - 1 && 'text-primary')}>
          {i > 0 ? ' ' : ''}
          {word}
        </span>
      ))}
    </span>
  );
}