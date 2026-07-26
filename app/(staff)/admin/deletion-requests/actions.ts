"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { parseRequiredText } from "@/lib/validation";

async function setStatus(formData: FormData, status: "actioned" | "dismissed") {
  const admin = await requireAdmin();
  const requestId = parseRequiredText(formData.get("request_id"), "Request");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("deletion_requests")
    .update({ status, actioned_by: admin.id, actioned_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error(`[deletion-request-${status}]`, error);
    throw new Error("Couldn't update this request. Please try again.");
  }

  revalidatePath("/admin/deletion-requests");
}

export async function markDeletionActioned(formData: FormData) {
  await setStatus(formData, "actioned");
}

export async function dismissDeletionRequest(formData: FormData) {
  await setStatus(formData, "dismissed");
}
