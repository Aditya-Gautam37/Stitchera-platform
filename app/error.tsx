"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center gap-4 p-8">
      <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="text-sm text-ink-soft">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
      >
        Try again
      </button>
    </main>
  );
}
