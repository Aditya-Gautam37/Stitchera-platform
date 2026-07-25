"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { parseMoney, parseOptionalText, parseRequiredText } from "@/lib/validation";

function parsePincodes(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function createCity(formData: FormData) {
  await requireAdmin();
  const name = parseRequiredText(formData.get("name"), "Name");
  const state = parseRequiredText(formData.get("state"), "State");
  const visitCharge = parseMoney(formData.get("visit_charge") ?? "0", "Visit charge");
  const deliveryCharge = parseMoney(
    formData.get("delivery_charge") ?? "0",
    "Delivery charge"
  );
  const minOrderValue = parseMoney(
    formData.get("min_order_value") ?? "0",
    "Minimum order value"
  );

  const supabase = await createClient();
  const { data: city, error } = await supabase
    .from("cities")
    .insert({
      name,
      name_hi: parseOptionalText(formData.get("name_hi")),
      state,
      pincodes: parsePincodes(formData.get("pincodes") as string | null),
      is_active: formData.get("is_active") === "on",
      visit_charge: visitCharge,
      delivery_charge: deliveryCharge,
      min_order_value: minOrderValue,
    })
    .select("id")
    .single();

  if (error || !city) {
    console.error("[create-city]", error);
    throw new Error("Couldn't create the city. Please try again.");
  }

  redirect(`/admin/cities/${city.id}`);
}

export async function updateCity(formData: FormData) {
  await requireAdmin();
  const cityId = parseRequiredText(formData.get("city_id"), "City");
  const name = parseRequiredText(formData.get("name"), "Name");
  const state = parseRequiredText(formData.get("state"), "State");
  const visitCharge = parseMoney(formData.get("visit_charge") ?? "0", "Visit charge");
  const deliveryCharge = parseMoney(
    formData.get("delivery_charge") ?? "0",
    "Delivery charge"
  );
  const minOrderValue = parseMoney(
    formData.get("min_order_value") ?? "0",
    "Minimum order value"
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("cities")
    .update({
      name,
      name_hi: parseOptionalText(formData.get("name_hi")),
      state,
      pincodes: parsePincodes(formData.get("pincodes") as string | null),
      is_active: formData.get("is_active") === "on",
      visit_charge: visitCharge,
      delivery_charge: deliveryCharge,
      min_order_value: minOrderValue,
    })
    .eq("id", cityId);

  if (error) {
    console.error("[update-city]", error);
    throw new Error("Couldn't save changes. Please try again.");
  }

  revalidatePath(`/admin/cities/${cityId}`);
  revalidatePath("/admin/cities");
}

export async function upsertCityPrice(formData: FormData) {
  await requireAdmin();
  const cityId = parseRequiredText(formData.get("city_id"), "City");
  const serviceId = parseRequiredText(formData.get("service_id"), "Service");
  const priceRaw = formData.get("price") as string | null;

  const supabase = await createClient();

  if (!priceRaw || !priceRaw.trim()) {
    const { error } = await supabase
      .from("city_service_prices")
      .delete()
      .eq("city_id", cityId)
      .eq("service_id", serviceId);
    if (error) {
      console.error("[delete-city-price]", error);
      throw new Error("Couldn't clear the override. Please try again.");
    }
  } else {
    const price = parseMoney(priceRaw, "Price");
    const { error } = await supabase.from("city_service_prices").upsert(
      { city_id: cityId, service_id: serviceId, price, is_active: true },
      { onConflict: "city_id,service_id" }
    );
    if (error) {
      console.error("[upsert-city-price]", error);
      throw new Error("Couldn't save the price. Please try again.");
    }
  }

  revalidatePath(`/admin/cities/${cityId}`);
}
