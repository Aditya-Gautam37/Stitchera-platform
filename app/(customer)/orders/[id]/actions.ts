"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orderId = formData.get("order_id") as string;
  const cancelReason =
    (formData.get("cancel_reason") as string | null)?.trim() || null;

  // RLS ("customer cancels own order") only allows this while the order is
  // still placed/confirmed, and the restrict_customer_order_update trigger
  // clamps every other column — this update can't smuggle in other changes.
  // A row-count check (via .select().single()) is required here too: if
  // this order belongs to someone else, or has already moved past
  // placed/confirmed, RLS matches zero rows rather than erroring — without
  // checking for a returned row, that would look like a successful cancel.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancel_reason: cancelReason })
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[cancel-order]", error);
    throw new Error(
      "Couldn't cancel this order — it may have already moved past a cancellable stage."
    );
  }

  revalidatePath(`/orders/${orderId}`);
}
