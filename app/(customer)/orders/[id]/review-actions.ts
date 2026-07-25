"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOptionalText } from "@/lib/validation";

function parseRating(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error("Rating must be between 1 and 5 stars");
  }
  return n;
}

export async function submitReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orderId = formData.get("order_id") as string;
  const tailorId = (formData.get("tailor_id") as string) || null;
  const deliveryAgentId = (formData.get("delivery_agent_id") as string) || null;
  const tailorRating = parseRating(formData.get("tailor_rating"));
  const deliveryRating = parseRating(formData.get("delivery_rating"));

  const rows: {
    order_id: string;
    customer_id: string;
    reviewee_type: "tailor" | "delivery_partner";
    tailor_id: string | null;
    delivery_agent_id: string | null;
    rating: number;
    comment: string | null;
  }[] = [];

  if (tailorId && tailorRating) {
    rows.push({
      order_id: orderId,
      customer_id: user.id,
      reviewee_type: "tailor",
      tailor_id: tailorId,
      delivery_agent_id: null,
      rating: tailorRating,
      comment: parseOptionalText(formData.get("tailor_comment")),
    });
  }
  if (deliveryAgentId && deliveryRating) {
    rows.push({
      order_id: orderId,
      customer_id: user.id,
      reviewee_type: "delivery_partner",
      tailor_id: null,
      delivery_agent_id: deliveryAgentId,
      rating: deliveryRating,
      comment: parseOptionalText(formData.get("delivery_comment")),
    });
  }

  if (!rows.length) {
    throw new Error("Please give at least one rating");
  }

  // RLS ("customer reviews own delivered order") independently re-checks
  // ownership, delivered status, and that each reviewee actually worked this
  // order — the form fields above are a convenience, not the security
  // boundary.
  const { error } = await supabase.from("reviews").insert(rows);

  if (error) {
    console.error("[submit-review]", error);
    throw new Error(
      error.code === "23505"
        ? "You've already reviewed this order."
        : "Couldn't submit your review. Please try again."
    );
  }

  revalidatePath(`/orders/${orderId}`);
}
