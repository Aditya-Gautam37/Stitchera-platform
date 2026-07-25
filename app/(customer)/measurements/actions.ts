"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GARMENT_TYPES, parseMeasurementValues } from "@/lib/measurements";
import { parseOptionalText, parseRequiredText } from "@/lib/validation";

export async function createMeasurement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const label = parseRequiredText(formData.get("label"), "Label");
  const garmentType = formData.get("garment_type") as string;
  if (!GARMENT_TYPES.includes(garmentType as (typeof GARMENT_TYPES)[number])) {
    throw new Error("Please choose a garment type");
  }
  const values = parseMeasurementValues(formData);

  const { error } = await supabase.from("measurements").insert({
    profile_id: user.id,
    label,
    garment_type: garmentType,
    person_name: parseOptionalText(formData.get("person_name")),
    notes: parseOptionalText(formData.get("notes")),
    values,
  });

  if (error) {
    console.error("[create-measurement]", error);
    throw new Error("Couldn't save these measurements. Please try again.");
  }

  revalidatePath("/measurements");
  redirect("/measurements");
}

export async function updateMeasurement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = parseRequiredText(formData.get("measurement_id"), "Measurement");
  const label = parseRequiredText(formData.get("label"), "Label");
  const garmentType = formData.get("garment_type") as string;
  if (!GARMENT_TYPES.includes(garmentType as (typeof GARMENT_TYPES)[number])) {
    throw new Error("Please choose a garment type");
  }
  const values = parseMeasurementValues(formData);

  // .eq("profile_id") plus the returned-row check below: RLS already scopes
  // this, but RLS answers a mismatch with zero rows rather than an error, so
  // without checking for a row back, editing someone else's measurement would
  // look like a success.
  const { data: updated, error } = await supabase
    .from("measurements")
    .update({
      label,
      garment_type: garmentType,
      person_name: parseOptionalText(formData.get("person_name")),
      notes: parseOptionalText(formData.get("notes")),
      values,
    })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[update-measurement]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath("/measurements");
  revalidatePath(`/measurements/${id}`);
  redirect("/measurements");
}

export async function archiveMeasurement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = parseRequiredText(formData.get("measurement_id"), "Measurement");

  // Soft-delete via is_active rather than a hard delete: order_items
  // references measurement_id, so past orders must keep pointing at the exact
  // measurements they were stitched from.
  const { data: updated, error } = await supabase
    .from("measurements")
    .update({ is_active: false })
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[archive-measurement]", error);
    throw new Error("Couldn't remove this measurement. Please try again.");
  }

  revalidatePath("/measurements");
}
