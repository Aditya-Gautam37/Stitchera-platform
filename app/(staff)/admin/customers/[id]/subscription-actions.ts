"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/constants";
import { parseRequiredText } from "@/lib/validation";

// Admin-only stopgap: there's no real subscription purchase flow yet
// (that's a separate phase — pricing, checkout, and renewal are product
// decisions this quick action shouldn't guess at). This exists purely so
// the 3-free-bookings cap this same phase introduces doesn't become a hard
// dead end for a real customer while that flow is still being built.
export async function grantSubscription(formData: FormData) {
  const admin = await requireAdmin();
  const customerId = parseRequiredText(formData.get("customer_id"), "Customer");
  const plan = formData.get("plan") as string;

  if (!SUBSCRIPTION_PLANS.some((p) => p.key === (plan as SubscriptionPlan))) {
    throw new Error("Invalid plan");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customer_subscriptions").insert({
    profile_id: customerId,
    plan,
    status: "active",
    granted_by: admin.id,
  });

  if (error) {
    console.error("[grant-subscription]", error);
    throw new Error("Couldn't grant a subscription. Please try again.");
  }

  revalidatePath(`/admin/customers/${customerId}`);
}
