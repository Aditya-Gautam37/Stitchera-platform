"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_CONSENT_VERSION } from "@/lib/consent";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = (formData.get("full_name") as string | null)?.trim();
  if (!fullName) {
    throw new Error("Name is required");
  }

  if (formData.get("consent") !== "on") {
    throw new Error("Please agree to the data collection notice to continue");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      consent_given_at: new Date().toISOString(),
      consent_version: CURRENT_CONSENT_VERSION,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[complete-onboarding]", error);
    throw new Error("Couldn't save your name. Please try again.");
  }

  redirect("/dashboard");
}
