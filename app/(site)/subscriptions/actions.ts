"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_PREFERENCES, type PaymentPreference } from "@/lib/constants";
import { parseRequiredText } from "@/lib/validation";

export async function purchaseSubscription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscriptions");

  const plan = parseRequiredText(formData.get("plan"), "Plan");
  const paymentPreferenceRaw = formData.get("payment_preference") as string | null;
  const paymentPreference: PaymentPreference = PAYMENT_PREFERENCES.includes(
    paymentPreferenceRaw as PaymentPreference
  )
    ? (paymentPreferenceRaw as PaymentPreference)
    : "cod";

  // purchase_subscription() validates the plan is real/active, replaces any
  // existing active subscription, and stores the price actually charged at
  // purchase time — it does not record a completed payment (there's no real
  // gateway yet, same reasoning as checkout): payment_preference is a
  // customer intent staff still has to confirm.
  const { error } = await supabase.rpc("purchase_subscription", {
    p_plan: plan,
    p_payment_preference: paymentPreference,
  });

  if (error) {
    console.error("[purchase-subscription]", error);
    throw new Error(
      error.code === "P0001"
        ? error.message
        : "Couldn't activate that plan. Please try again."
    );
  }

  revalidatePath("/subscriptions");
  redirect("/subscriptions?activated=1");
}
