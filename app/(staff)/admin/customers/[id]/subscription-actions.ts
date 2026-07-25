"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/constants";
import { parseRequiredText } from "@/lib/validation";

// Admin override — for comping a plan, or activating one for a customer who
// paid offline before asking. The real self-serve purchase path is
// /subscriptions (purchase_subscription()); this exists alongside it, not
// instead of it.
export async function grantSubscription(formData: FormData) {
  const admin = await requireAdmin();
  const customerId = parseRequiredText(formData.get("customer_id"), "Customer");
  const plan = formData.get("plan") as string;

  if (!SUBSCRIPTION_PLANS.some((p) => p.key === (plan as SubscriptionPlan))) {
    throw new Error("Invalid plan");
  }

  const supabase = await createClient();

  const { data: planRow } = await supabase
    .from("subscription_plans")
    .select("price, billing_period_days")
    .eq("key", plan)
    .single();

  // Mirrors purchase_subscription()'s "one active subscription at a time" —
  // granting a new plan replaces the old one rather than stacking.
  const { error: cancelError } = await supabase
    .from("customer_subscriptions")
    .update({ status: "cancelled" })
    .eq("profile_id", customerId)
    .eq("status", "active");
  if (cancelError) {
    console.error("[grant-subscription:cancel-existing]", cancelError);
    throw new Error("Couldn't grant a subscription. Please try again.");
  }

  const { error } = await supabase.from("customer_subscriptions").insert({
    profile_id: customerId,
    plan,
    status: "active",
    expires_at: planRow
      ? new Date(
          Date.now() + planRow.billing_period_days * 24 * 60 * 60 * 1000
        ).toISOString()
      : null,
    price_paid: planRow?.price ?? null,
    granted_by: admin.id,
  });

  if (error) {
    console.error("[grant-subscription]", error);
    throw new Error("Couldn't grant a subscription. Please try again.");
  }

  revalidatePath(`/admin/customers/${customerId}`);
}
