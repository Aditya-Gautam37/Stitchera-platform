import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center gap-4 p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
      <p className="text-sm text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
      >
        Go home
      </Link>
    </main>
  );
}
