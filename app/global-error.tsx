"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-full bg-cotton text-ink antialiased">
        <main className="mx-auto flex max-w-md flex-col items-start gap-4 p-8">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-ink-soft">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
