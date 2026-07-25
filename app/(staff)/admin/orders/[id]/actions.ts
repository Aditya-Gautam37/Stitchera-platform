"use server";

import { revalidatePath } from "next/cache";
import { ORDER_STATUSES, PAYMENT_MODES, type PaymentMode } from "@/lib/constants";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { parseMoney, parseOptionalText, parseRequiredText } from "@/lib/validation";

// Every mutation below chains .select().single() and checks the result
// instead of trusting `error === null`. RLS ("staff manage city orders")
// silently matches ZERO rows — not an error — when a city_manager targets
// an order outside their own city. Without checking that a row actually
// came back, that request would look identical to a successful update:
// no error thrown, page revalidated, nothing actually changed. That's a
// blocked attack turning into a confusing false "success" rather than a
// visible failure — this makes RLS's rejection observable.

export async function updateOrderStatus(formData: FormData) {
  await requireStaff();
  const orderId = formData.get("order_id") as string;
  const status = formData.get("status") as string;

  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    throw new Error("Invalid status");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[update-order-status]", error);
    throw new Error("Couldn't update this order — you may not have access to it.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function assignPickupAgent(formData: FormData) {
  await requireStaff();
  const orderId = formData.get("order_id") as string;
  const pickupAgentId = (formData.get("pickup_agent_id") as string) || null;

  const supabase = await createClient();

  // Belt-and-braces: confirm the agent is actually a pickup_agent in the
  // SAME city as the order before assigning them. Nothing upstream of this
  // enforces that relationship — RLS grants any staff member row-level
  // access to any order in their own city and to any profile with
  // is_staff() true, but never cross-checks the two IDs against each other.
  if (pickupAgentId) {
    const { data: order } = await supabase
      .from("orders")
      .select("city_id")
      .eq("id", orderId)
      .single();

    const { data: agent } = await supabase
      .from("profiles")
      .select("role, city_id")
      .eq("id", pickupAgentId)
      .single();

    if (
      !order ||
      !agent ||
      agent.role !== "pickup_agent" ||
      agent.city_id !== order.city_id
    ) {
      throw new Error("That pickup agent doesn't belong to this order's city");
    }
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ pickup_agent_id: pickupAgentId })
    .eq("id", orderId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[assign-pickup-agent]", error);
    throw new Error("Couldn't update this order — you may not have access to it.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function assignTailor(formData: FormData) {
  await requireStaff();
  const orderId = formData.get("order_id") as string;
  const tailorId = (formData.get("tailor_id") as string) || null;

  const supabase = await createClient();

  if (tailorId) {
    const { data: order } = await supabase
      .from("orders")
      .select("city_id")
      .eq("id", orderId)
      .single();

    const { data: tailor } = await supabase
      .from("tailors")
      .select("city_id, status")
      .eq("id", tailorId)
      .single();

    if (!order || !tailor || tailor.city_id !== order.city_id) {
      throw new Error("That tailor doesn't belong to this order's city");
    }
    if (tailor.status !== "active") {
      throw new Error("That tailor isn't currently active");
    }
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ tailor_id: tailorId })
    .eq("id", orderId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[assign-tailor]", error);
    throw new Error("Couldn't update this order — you may not have access to it.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function setPromisedDate(formData: FormData) {
  await requireStaff();
  const orderId = formData.get("order_id") as string;
  const promisedDate = (formData.get("promised_date") as string) || null;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ promised_date: promisedDate })
    .eq("id", orderId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[set-promised-date]", error);
    throw new Error("Couldn't update this order — you may not have access to it.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
}

export async function recordPayment(formData: FormData) {
  await requireStaff();
  const orderId = parseRequiredText(formData.get("order_id"), "Order");
  const amount = parseMoney(formData.get("amount"), "Amount");
  const mode = formData.get("mode") as string;
  const gatewayRef = parseOptionalText(formData.get("gateway_ref"));

  if (!PAYMENT_MODES.includes(mode as PaymentMode)) {
    throw new Error("Invalid payment mode");
  }
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const supabase = await createClient();

  // record_payment() inserts the ledger row and recomputes the order's
  // payment_status from the sum of successful payments — one transaction, so
  // the status can never disagree with the ledger behind it. It also rejects
  // collecting more than the order total.
  const { error } = await supabase.rpc("record_payment", {
    p_order_id: orderId,
    p_amount: amount,
    p_mode: mode,
    p_gateway_ref: gatewayRef,
  });

  if (error) {
    console.error("[record-payment]", error);
    // The function's own RAISE EXCEPTION messages (SQLSTATE P0001) are
    // written for staff to read — e.g. "that would collect ₹200 more than
    // the order total". Anything else is internal detail.
    throw new Error(
      error.code === "P0001"
        ? error.message
        : "Couldn't record this payment. Please try again."
    );
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}
