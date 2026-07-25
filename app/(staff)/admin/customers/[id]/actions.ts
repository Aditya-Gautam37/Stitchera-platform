"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { GARMENT_TYPES, parseMeasurementValues } from "@/lib/measurements";
import { parseOptionalText, parseRequiredText } from "@/lib/validation";

export async function recordCustomerMeasurement(formData: FormData) {
  const staff = await requireStaff();
  const customerId = parseRequiredText(formData.get("customer_id"), "Customer");
  const label = parseRequiredText(formData.get("label"), "Label");
  const garmentType = formData.get("garment_type") as string;
  if (!GARMENT_TYPES.includes(garmentType as (typeof GARMENT_TYPES)[number])) {
    throw new Error("Please choose a garment type");
  }
  const values = parseMeasurementValues(formData);

  const supabase = await createClient();

  // taken_by records WHO measured — the column exists precisely so a bad fit
  // can be traced back to the person who took the numbers.
  const { data: created, error } = await supabase
    .from("measurements")
    .insert({
      profile_id: customerId,
      label,
      garment_type: garmentType,
      person_name: parseOptionalText(formData.get("person_name")),
      notes: parseOptionalText(formData.get("notes")),
      values,
      taken_by: staff.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[record-customer-measurement]", error);
    throw new Error(
      "Couldn't save these measurements — you may not have access to this customer."
    );
  }

  revalidatePath(`/admin/customers/${customerId}`);
}
