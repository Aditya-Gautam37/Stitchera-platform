// Generic fallback for any /admin route — covers every page under the
// (staff) layout's children slot, since none of the 22 admin pages have
// their own more specific loading.tsx.
export default function StaffLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3">
        <div className="h-14 rounded border bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-14 rounded border bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-14 rounded border bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
