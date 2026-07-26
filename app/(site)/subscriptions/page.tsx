import { createClient } from "@/lib/supabase/server";
import { PAYMENT_PREFERENCE_LABELS, PAYMENT_PREFERENCES } from "@/lib/constants";
import { SubmitButton } from "@/components/submit-button";
import { purchaseSubscription } from "./actions";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; activated?: string }>;
}) {
  const { reason, activated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("key, name, tagline, price, billing_period_days")
    .order("sort_order");

  let currentPlan: string | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("customer_subscriptions")
      .select("plan")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    currentPlan = sub?.plan ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">
        Subscription plans
      </h1>

      {activated && (
        <p className="mt-3 rounded border border-indigo bg-paper px-4 py-3 text-sm text-ink">
          Your plan is active. Our team will confirm payment with you
          directly — you can keep booking in the meantime.
        </p>
      )}
      {reason === "cap" && !activated && (
        <p className="mt-3 text-ink-soft">
          You&apos;ve used your 3 free bookings. Choose a plan below to keep
          booking.
        </p>
      )}
      {!reason && !activated && (
        <p className="mt-3 max-w-md text-ink-soft">
          Your first 3 bookings are free. After that, pick a plan to keep
          going.
        </p>
      )}

      {!plans?.length ? (
        <p className="mt-8 text-sm text-ink-soft">
          No plans are available right now — check back soon.
        </p>
      ) : (
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`flex flex-col gap-3 rounded border p-5 ${
                isCurrent ? "border-indigo" : "border-line"
              }`}
            >
              <div>
                <p className="font-display text-xl font-bold text-ink">
                  {plan.name}
                  {isCurrent && (
                    <span className="ml-2 rounded-full bg-indigo px-2 py-0.5 text-xs font-normal text-paper">
                      Current plan
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">{plan.tagline}</p>
              </div>
              <p className="font-mono text-2xl font-medium text-ink">
                ₹{plan.price}
                <span className="text-sm font-normal text-ink-soft">
                  {" "}
                  / {plan.billing_period_days} days
                </span>
              </p>

              {!isCurrent && (
                <form action={purchaseSubscription} className="flex flex-col gap-2">
                  <input type="hidden" name="plan" value={plan.key} />
                  <fieldset className="flex flex-col gap-1">
                    <legend className="text-xs text-ink-soft">
                      How will you pay?
                    </legend>
                    {PAYMENT_PREFERENCES.map((pref) => (
                      <label key={pref} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="payment_preference"
                          value={pref}
                          defaultChecked={pref === "cod"}
                        />
                        {PAYMENT_PREFERENCE_LABELS[pref]}
                      </label>
                    ))}
                  </fieldset>
                  <SubmitButton
                    pendingText="Activating..."
                    className="mt-1 w-fit rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper hover:bg-indigo-strong disabled:opacity-50"
                  >
                    {currentPlan ? "Switch to this plan" : "Subscribe"}
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
      )}
      <p className="mt-6 text-xs text-ink-soft">
        Online payment isn&apos;t live yet — our team confirms payment with
        you directly after you choose a plan.
      </p>
    </div>
  );
}
