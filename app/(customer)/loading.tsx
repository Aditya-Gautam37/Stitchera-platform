// Generic fallback for any (customer) route — dashboard, orders, book,
// measurements all share this rather than a per-page skeleton, since the
// customer group's pages are simpler and more uniform than (site)'s.
export default function CustomerLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-7 w-40 rounded bg-line-soft" />
      <div className="flex flex-col gap-3">
        <div className="h-14 rounded-2xl bg-line-soft" />
        <div className="h-14 rounded-2xl bg-line-soft" />
        <div className="h-14 rounded-2xl bg-line-soft" />
      </div>
    </div>
  );
}
