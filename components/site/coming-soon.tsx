export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <span className="font-mono text-xs uppercase tracking-wide text-indigo">
        {phase}
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 max-w-md text-ink-soft">{description}</p>
    </div>
  );
}
