import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { authInputClass, authPrimaryButtonClass } from "@/components/auth/styles";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
            What should we call you?
          </h1>
          <form action={completeOnboarding} className="mt-5 flex flex-col gap-4">
            <input
              type="text"
              name="full_name"
              placeholder="Full name"
              required
              className={authInputClass}
            />
            <button type="submit" className={authPrimaryButtonClass}>
              Continue
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
