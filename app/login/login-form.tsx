"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidPhone, normalizePhone } from "@/lib/phone";

const RESEND_COOLDOWN_SECONDS = 30;

export function LoginForm({ next }: { next: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setError("Please enter a valid phone number, e.g. 98765 43210");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) {
      setError(error.message);
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
      setError(error.message);
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
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Log in</h1>

      {stage === "phone" ? (
        <form onSubmit={sendOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Phone number
            <input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="rounded border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600">
            Enter the code sent to {phone}
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
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
              className="text-zinc-500 underline"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={resendOtp}
              disabled={cooldown > 0 || loading}
              className="text-zinc-500 underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
