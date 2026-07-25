"use client";

import { useEffect } from "react";

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
      <body>
        <main style={{ padding: 32, maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#71717a", fontSize: 14, marginTop: 8 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              borderRadius: 6,
              background: "black",
              color: "white",
              padding: "8px 16px",
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
