"use server";

import { revalidatePath } from "next/cache";
import { requireTailor } from "@/lib/dal/tailor";
import { createClient } from "@/lib/supabase/server";
import { parseRequiredText } from "@/lib/validation";

export async function markOrderReady(formData: FormData) {
  const tailor = await requireTailor();
  const orderId = parseRequiredText(formData.get("order_id"), "Order");

  const supabase = await createClient();

  // RLS ("tailor updates own assigned order") plus the
  // restrict_customer_order_update() trigger (0012) independently enforce
  // ownership and that the only legal transition here is
  // with_tailor -> ready — this action's own tailor_id filter is a
  // convenience, not the security boundary. .select().single() below is
  // what makes a blocked attempt (wrong tailor, wrong status) surface as a
  // real error instead of a silent no-op, same reasoning as every other
  // order mutation in this app.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "ready", ready_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("tailor_id", tailor.id)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[mark-order-ready]", error);
    throw new Error(
      "Couldn't mark this order ready — it may not be with you right now."
    );
  }

  revalidatePath(`/tailor/orders/${orderId}`);
  revalidatePath("/tailor");
  revalidatePath("/tailor/orders");
}
