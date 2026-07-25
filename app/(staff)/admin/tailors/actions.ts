"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  parseOptionalText,
  parsePercent,
  parsePositiveInt,
  parseRequiredText,
  parseSpecialities,
} from "@/lib/validation";

const TAILOR_STATUSES = [
  "pending_verification",
  "active",
  "suspended",
  "inactive",
];

export async function createTailor(formData: FormData) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") throw new Error("Not authorized");

  const cityId =
    profile.role === "admin"
      ? (formData.get("city_id") as string)
      : profile.city_id;
  if (!cityId) throw new Error("City is required");

  const name = parseRequiredText(formData.get("name"), "Name");
  const phone = parseRequiredText(formData.get("phone"), "Phone");
  const dailyCapacity = parsePositiveInt(
    formData.get("daily_capacity") ?? "5",
    "Daily capacity"
  );
  const commissionPct = parsePercent(
    formData.get("commission_pct") ?? "25",
    "Commission"
  );

  const supabase = await createClient();
  const { data: tailor, error } = await supabase
    .from("tailors")
    .insert({
      name,
      phone,
      shop_name: parseOptionalText(formData.get("shop_name")),
      address: parseOptionalText(formData.get("address")),
      city_id: cityId,
      specialities: parseSpecialities(
        formData.get("specialities") as string | null
      ),
      daily_capacity: dailyCapacity,
      commission_pct: commissionPct,
    })
    .select("id")
    .single();

  if (error || !tailor) {
    console.error("[create-tailor]", error);
    throw new Error("Couldn't create the tailor. Please try again.");
  }

  redirect(`/admin/tailors/${tailor.id}`);
}

export async function updateTailor(formData: FormData) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") throw new Error("Not authorized");

  const tailorId = parseRequiredText(formData.get("tailor_id"), "Tailor");
  const name = parseRequiredText(formData.get("name"), "Name");
  const phone = parseRequiredText(formData.get("phone"), "Phone");
  const dailyCapacity = parsePositiveInt(
    formData.get("daily_capacity") ?? "5",
    "Daily capacity"
  );
  const commissionPct = parsePercent(
    formData.get("commission_pct") ?? "25",
    "Commission"
  );
  const status = formData.get("status") as string;
  if (!TAILOR_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  const supabase = await createClient();

  // RLS ("staff manage tailors") grants a city_manager write access to any
  // tailor in their own city — it has no way to know which tailor THIS
  // request is for until the update runs. Without this check, a
  // city_manager could edit a tailor belonging to a different city simply
  // by submitting that tailor's id, since nothing upstream compares the
  // two city_ids.
  if (profile.role !== "admin") {
    const { data: tailor } = await supabase
      .from("tailors")
      .select("city_id")
      .eq("id", tailorId)
      .single();
    if (!tailor || tailor.city_id !== profile.city_id) {
      throw new Error("Not authorized to edit this tailor");
    }
  }

  const { data: updated, error } = await supabase
    .from("tailors")
    .update({
      name,
      phone,
      shop_name: parseOptionalText(formData.get("shop_name")),
      address: parseOptionalText(formData.get("address")),
      specialities: parseSpecialities(
        formData.get("specialities") as string | null
      ),
      daily_capacity: dailyCapacity,
      commission_pct: commissionPct,
      status,
    })
    .eq("id", tailorId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[update-tailor]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath(`/admin/tailors/${tailorId}`);
}

// Tailors created here directly (as opposed to approved from a self-serve
// partner_applications submission) get profile_id = null — there's no app
// account for them to sign into /tailor with. This is the only way to give
// one a login after the fact: point it at an existing customer account by
// phone, same "they must already have an account" constraint promoteByPhone
// (../staff/actions.ts) uses for staff roles.
export async function linkTailorProfile(formData: FormData) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") throw new Error("Not authorized");

  const tailorId = parseRequiredText(formData.get("tailor_id"), "Tailor");
  const rawPhone = parseRequiredText(formData.get("phone"), "Phone number");
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    throw new Error("That doesn't look like a valid phone number");
  }

  const supabase = await createClient();

  if (profile.role !== "admin") {
    const { data: tailor } = await supabase
      .from("tailors")
      .select("city_id")
      .eq("id", tailorId)
      .single();
    if (!tailor || tailor.city_id !== profile.city_id) {
      throw new Error("Not authorized to edit this tailor");
    }
  }

  const { data: account } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .single();

  if (!account) {
    throw new Error(
      "No account found with that phone number — they must sign up in the app first."
    );
  }

  const { data: alreadyLinked } = await supabase
    .from("tailors")
    .select("id")
    .eq("profile_id", account.id)
    .maybeSingle();
  if (alreadyLinked) {
    throw new Error("That account is already linked to a different tailor.");
  }

  const { data: updated, error } = await supabase
    .from("tailors")
    .update({ profile_id: account.id })
    .eq("id", tailorId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[link-tailor-profile]", error);
    throw new Error("Couldn't link this account. Please try again.");
  }

  revalidatePath(`/admin/tailors/${tailorId}`);
}
