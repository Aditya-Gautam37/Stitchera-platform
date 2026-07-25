"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { parseMoney, parsePositiveInt, parseRequiredText } from "@/lib/validation";

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const key = parseRequiredText(formData.get("key"), "Plan");
  const name = parseRequiredText(formData.get("name"), "Name");
  const tagline = parseRequiredText(formData.get("tagline"), "Tagline");
  const price = parseMoney(formData.get("price"), "Price");
  const billingPeriodDays = parsePositiveInt(
    formData.get("billing_period_days") ?? "30",
    "Billing period"
  );
  const isActive = formData.get("is_active") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name,
      tagline,
      price,
      billing_period_days: billingPeriodDays,
      is_active: isActive,
    })
    .eq("key", key);

  if (error) {
    console.error("[update-plan]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/subscriptions");
}
