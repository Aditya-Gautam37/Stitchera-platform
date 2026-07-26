"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { authInputClass, authPrimaryButtonClass } from "@/components/auth/styles";

const RESEND_COOLDOWN_SECONDS = 30;

type AuthErrorKind = "invalid_credentials" | "unconfirmed" | "generic";
type AuthError = { kind: AuthErrorKind; message: string };

function classifyAuthError(message: string): AuthErrorKind {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "invalid_credentials";
  if (m.includes("email not confirmed")) return "unconfirmed";
  return "generic";
}

const tabClass = (active: boolean) =>
  `flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-indigo bg-indigo text-paper"
      : "border-line text-ink-soft hover:border-indigo"
  }`;

export function LoginForm({ next }: { next: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [method, setMethod] = useState<"phone" | "email">("email");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [cooldown, setCooldown] = useState(0);

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"login" | "signup" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  const [error, setError] = useState<AuthError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function switchEmailMode(mode: "login" | "signup" | "forgot") {
    setEmailMode(mode);
    setError(null);
    setNotice(null);
    setResetSent(false);
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setError({ kind: "generic", message: "Please enter a valid phone number, e.g. 98765 43210" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) {
      setError({ kind: classifyAuthError(error.message), message: error.message });
      return;
    }
    setPhone(normalized);
    setStage("otp");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      setError({ kind: classifyAuthError(error.message), message: error.message });
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      setError({ kind: classifyAuthError(error.message), message: error.message });
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    if (emailMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      setLoading(false);
      if (error) {
        setError({ kind: classifyAuthError(error.message), message: error.message });
        return;
      }
      if (!data.session) {
        setNotice(
          `Account created — check ${trimmedEmail} for a confirmation link, then log in.`
        );
        switchEmailMode("login");
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    if (error) {
      setError({ kind: classifyAuthError(error.message), message: error.message });
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function submitForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError({ kind: classifyAuthError(error.message), message: error.message });
      return;
    }
    setResetSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold text-ink">
            Stitchera
          </Link>
          <p className="mt-1 text-sm text-ink-soft">Doorstep tailoring, sorted.</p>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-7">
          <h1 className="font-display text-xl font-bold text-ink">
            {method === "email" && emailMode === "signup"
              ? "Create your account"
              : method === "email" && emailMode === "forgot"
                ? "Reset your password"
                : "Log in"}
          </h1>

          {!(method === "email" && emailMode === "forgot") && (
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod("email");
                  setError(null);
                  setNotice(null);
                }}
                className={tabClass(method === "email")}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("phone");
                  setError(null);
                  setNotice(null);
                }}
                className={tabClass(method === "phone")}
              >
                Phone
              </button>
            </div>
          )}

          <div className="mt-6">
            {method === "email" && emailMode === "forgot" ? (
              resetSent ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-ink-soft">
                    If an account exists for <strong className="text-ink">{email}</strong>,
                    a reset link is on its way — check your inbox.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchEmailMode("login")}
                    className="text-sm font-medium text-indigo underline"
                  >
                    Back to log in
                  </button>
                </div>
              ) : (
                <form onSubmit={submitForgotPassword} className="flex flex-col gap-4">
                  <p className="text-sm text-ink-soft">
                    Enter your email and we&apos;ll send you a link to set a new password.
                  </p>
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={authInputClass}
                    />
                  </label>
                  <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchEmailMode("login")}
                    className="text-sm text-ink-soft underline"
                  >
                    Back to log in
                  </button>
                </form>
              )
            ) : method === "email" ? (
              <form onSubmit={submitEmail} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={authInputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink">
                  <span className="flex items-center justify-between">
                    Password
                    {emailMode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchEmailMode("forgot")}
                        className="text-xs font-normal text-indigo underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className={authInputClass}
                  />
                </label>
                <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                  {loading
                    ? "Please wait..."
                    : emailMode === "signup"
                      ? "Sign up"
                      : "Log in"}
                </button>
                <button
                  type="button"
                  onClick={() => switchEmailMode(emailMode === "signup" ? "login" : "signup")}
                  className="text-sm text-ink-soft underline"
                >
                  {emailMode === "signup"
                    ? "Already have an account? Log in"
                    : "New here? Create an account"}
                </button>
              </form>
            ) : stage === "phone" ? (
              <form onSubmit={sendOtp} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Phone number
                  <input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className={authInputClass}
                  />
                </label>
                <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="flex flex-col gap-4">
                <p className="text-sm text-ink-soft">
                  Enter the code sent to {phone}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className={authInputClass}
                />
                <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
                  {loading ? "Verifying..." : "Verify"}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStage("phone");
                      setOtp("");
                      setError(null);
                    }}
                    className="text-ink-soft underline"
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={cooldown > 0 || loading}
                    className="text-ink-soft underline disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {notice && (
            <p className="mt-4 text-sm text-ink-soft">{notice}</p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-thread-red">
              {error.kind === "invalid_credentials" ? (
                <>
                  We couldn&apos;t find an account with that email and password.{" "}
                  <button
                    type="button"
                    onClick={() => switchEmailMode("signup")}
                    className="underline"
                  >
                    Create an account
                  </button>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={() => switchEmailMode("forgot")}
                    className="underline"
                  >
                    reset your password
                  </button>{" "}
                  if you forgot it.
                </>
              ) : error.kind === "unconfirmed" ? (
                <>Check your inbox — we sent a confirmation link to {email.trim()}.</>
              ) : (
                error.message
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
