export default function SectionCard({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/75 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}