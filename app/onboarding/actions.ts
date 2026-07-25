"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    console.error("[complete-onboarding]", error);
    throw new Error("Couldn't save your name. Please try again.");
  }

  redirect("/dashboard");
}
