"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authInputClass, authPrimaryButtonClass } from "@/components/auth/styles";

export function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();

  // The recovery link logs the visitor in via a short-lived session before
  // this page ever renders its form — until that lands (or if this page
  // was opened directly, not from the emailed link) there's no session to
  // update a password on.
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold text-ink">
            Stitchera
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-7">
          <h1 className="font-display text-xl font-bold text-ink">
            Set a new password
          </h1>

          {done ? (
            <p className="mt-4 text-sm text-ink-soft">
              Password updated — taking you to your dashboard...
            </p>
          ) : !ready ? (
            <p className="mt-4 text-sm text-ink-soft">
              Open this page from the reset link in your email. If you got
              here another way,{" "}
              <Link href="/login" className="text-indigo underline">
                go back to log in
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-ink">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={authInputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className={authInputClass}
                />
              </label>
              <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                {loading ? "Saving..." : "Update password"}
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-thread-red">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
