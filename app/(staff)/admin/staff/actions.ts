"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { parseRequiredText } from "@/lib/validation";

const ASSIGNABLE_ROLES = ["customer", "pickup_agent", "city_manager", "admin"];

export async function updateStaffRole(formData: FormData) {
  const actor = await requireAdmin();
  const profileId = parseRequiredText(formData.get("profile_id"), "Profile");
  const role = formData.get("role") as string;
  const cityId = (formData.get("city_id") as string) || null;
  const isActive = formData.get("is_active") === "on";

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }
  if (profileId === actor.id && (role !== "admin" || !isActive)) {
    throw new Error("You can't demote or deactivate your own account");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, city_id: cityId, is_active: isActive })
    .eq("id", profileId);

  if (error) {
    console.error("[update-staff-role]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath("/admin/staff");
}

export async function promoteByPhone(formData: FormData) {
  await requireAdmin();
  const rawPhone = parseRequiredText(formData.get("phone"), "Phone number");
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    throw new Error("That doesn't look like a valid phone number");
  }

  const role = formData.get("role") as string;
  if (!ASSIGNABLE_ROLES.includes(role) || role === "customer") {
    throw new Error("Invalid role");
  }
  const cityId = (formData.get("city_id") as string) || null;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .single();

  if (!existing) {
    throw new Error(
      "No account found with that phone number — they must sign up first."
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, city_id: cityId })
    .eq("id", existing.id);

  if (error) {
    console.error("[promote-by-phone]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath("/admin/staff");
}
