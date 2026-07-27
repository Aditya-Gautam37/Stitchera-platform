// Generic fallback for any (tailor) route — overview, orders, order detail,
// and payouts all share this rather than a per-page skeleton.
export default function TailorLoading() {
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
