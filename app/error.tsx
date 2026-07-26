"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/styles";

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
      <button onClick={reset} className={buttonClass("primary", "md")}>
        Try again
      </button>
    </main>
  );
}
