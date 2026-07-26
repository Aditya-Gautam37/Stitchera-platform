// Generic fallback for any (site) route without its own more specific
// loading.tsx (e.g. /services has one tailored to its own layout, which
// takes precedence over this one for that route).
export default function SiteLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-10">
      <div className="h-7 w-48 rounded bg-line-soft" />
      <div className="mt-3 h-4 w-64 rounded bg-line-soft" />
      <div className="mt-8 flex flex-col gap-3">
        <div className="h-20 rounded-2xl bg-line-soft" />
        <div className="h-20 rounded-2xl bg-line-soft" />
        <div className="h-20 rounded-2xl bg-line-soft" />
      </div>
    </div>
  );
}
