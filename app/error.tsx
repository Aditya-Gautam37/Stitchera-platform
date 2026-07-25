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
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-500">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="rounded bg-black px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </main>
  );
}
