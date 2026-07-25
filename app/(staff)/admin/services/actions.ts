"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import {
  parseMoney,
  parseNonNegativeInt,
  parseOptionalText,
  parsePositiveInt,
  parseRequiredText,
} from "@/lib/validation";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createService(formData: FormData) {
  await requireAdmin();
  const name = parseRequiredText(formData.get("name"), "Name");
  const slug = parseOptionalText(formData.get("slug")) ?? slugify(name);
  const category = parseRequiredText(formData.get("category"), "Category");
  const garmentType = parseRequiredText(
    formData.get("garment_type"),
    "Garment type"
  );
  const basePrice = parseMoney(formData.get("base_price"), "Base price");
  const estDays = parsePositiveInt(
    formData.get("est_days") ?? "3",
    "Estimated days"
  );
  const sortOrder = parseNonNegativeInt(
    formData.get("sort_order") ?? "0",
    "Sort order"
  );

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .insert({
      slug,
      name,
      name_hi: parseOptionalText(formData.get("name_hi")),
      category,
      garment_type: garmentType,
      description: parseOptionalText(formData.get("description")),
      base_price: basePrice,
      est_days: estDays,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !service) {
    console.error("[create-service]", error);
    throw new Error(
      error?.code === "23505"
        ? "A service with that slug already exists."
        : "Couldn't create the service. Please try again."
    );
  }

  redirect(`/admin/services/${service.id}`);
}

export async function updateService(formData: FormData) {
  await requireAdmin();
  const serviceId = parseRequiredText(formData.get("service_id"), "Service");
  const name = parseRequiredText(formData.get("name"), "Name");
  const category = parseRequiredText(formData.get("category"), "Category");
  const garmentType = parseRequiredText(
    formData.get("garment_type"),
    "Garment type"
  );
  const basePrice = parseMoney(formData.get("base_price"), "Base price");
  const estDays = parsePositiveInt(
    formData.get("est_days") ?? "3",
    "Estimated days"
  );
  const sortOrder = parseNonNegativeInt(
    formData.get("sort_order") ?? "0",
    "Sort order"
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name,
      name_hi: parseOptionalText(formData.get("name_hi")),
      category,
      garment_type: garmentType,
      description: parseOptionalText(formData.get("description")),
      base_price: basePrice,
      est_days: estDays,
      sort_order: sortOrder,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", serviceId);

  if (error) {
    console.error("[update-service]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
  revalidatePath("/services");
}
