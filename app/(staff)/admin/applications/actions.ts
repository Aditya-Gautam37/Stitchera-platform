"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { parseOptionalText, parseRequiredText } from "@/lib/validation";

export async function approveApplication(formData: FormData) {
  const staff = await requireStaff();
  const applicationId = parseRequiredText(
    formData.get("application_id"),
    "Application"
  );

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("partner_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (!application) {
    throw new Error("Application not found — you may not have access to it.");
  }

  // Approving a delivery_partner sets profiles.role = 'pickup_agent', which
  // is a staff-level role (is_staff() includes pickup_agent). The
  // prevent_privilege_escalation() trigger (0002) already clamps role
  // changes from anyone but an admin back to their old value — this check
  // just turns that into a clear error instead of a silent no-op.
  if (application.applicant_type === "delivery_partner") {
    await requireAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ role: "pickup_agent", city_id: application.city_id })
      .eq("id", application.profile_id);
    if (error) {
      console.error("[approve-application:promote]", error);
      throw new Error("Couldn't approve this application. Please try again.");
    }
  } else {
    if (staff.role !== "admin" && application.city_id !== staff.city_id) {
      throw new Error("Not authorized to approve this application");
    }
    const { error } = await supabase.from("tailors").insert({
      profile_id: application.profile_id,
      name: application.full_name,
      phone: application.phone,
      shop_name: application.shop_name,
      address: application.address,
      city_id: application.city_id,
      specialities: application.specialities,
      daily_capacity: application.daily_capacity ?? 5,
      status: "active",
    });
    if (error) {
      console.error("[approve-application:create-tailor]", error);
      throw new Error("Couldn't approve this application. Please try again.");
    }
  }

  const { error: updateError } = await supabase
    .from("partner_applications")
    .update({
      status: "approved",
      reviewed_by: staff.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    console.error("[approve-application:mark]", updateError);
    throw new Error("Approved, but couldn't update the application record.");
  }

  revalidatePath("/admin/applications");
}

export async function rejectApplication(formData: FormData) {
  const staff = await requireStaff();
  const applicationId = parseRequiredText(
    formData.get("application_id"),
    "Application"
  );
  const reason = parseOptionalText(formData.get("rejection_reason"));

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("partner_applications")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: staff.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[reject-application]", error);
    throw new Error("Couldn't reject this application — you may not have access to it.");
  }

  revalidatePath("/admin/applications");
}
