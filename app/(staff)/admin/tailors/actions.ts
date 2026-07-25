"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import {
  parseOptionalText,
  parsePercent,
  parsePositiveInt,
  parseRequiredText,
} from "@/lib/validation";

function parseSpecialities(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
