export default function ServicesLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-10">
      <div className="h-7 w-32 rounded bg-line-soft" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-line-soft" />
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-3 rounded border border-line bg-paper p-4">
            <div className="h-10 w-10 rounded bg-line-soft" />
            <div className="h-4 w-3/4 rounded bg-line-soft" />
            <div className="h-3 w-1/2 rounded bg-line-soft" />
            <div className="mt-2 h-5 w-16 rounded bg-line-soft" />
          </li>
        ))}
      </ul>
    </div>
  );
}
