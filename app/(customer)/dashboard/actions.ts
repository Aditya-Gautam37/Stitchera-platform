"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOptionalText } from "@/lib/validation";

export async function requestAccountDeletion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const reason = parseOptionalText(formData.get("reason"));

  const { error } = await supabase.from("deletion_requests").insert({
    profile_id: user.id,
    reason,
  });

  if (error) {
    console.error("[request-account-deletion]", error);
    throw new Error(
      "Couldn't submit your request — you may already have one pending."
    );
  }

  revalidatePath("/dashboard");
}
