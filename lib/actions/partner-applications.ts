"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseOptionalText,
  parsePositiveInt,
  parseRequiredText,
  parseSpecialities,
} from "@/lib/validation";

const TAILOR_REGISTRATION_FEE = 199;
const DELIVERY_REGISTRATION_FEE = 79;

export async function submitTailorApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = parseRequiredText(formData.get("full_name"), "Name");
  const phone = parseRequiredText(formData.get("phone"), "Phone");
  const cityId = parseRequiredText(formData.get("city_id"), "City");
  const shopName = parseOptionalText(formData.get("shop_name"));
  const address = parseOptionalText(formData.get("address"));
  const specialities = parseSpecialities(formData.get("specialities"));
  const dailyCapacity = parsePositiveInt(
    formData.get("daily_capacity") ?? "5",
    "Daily capacity"
  );

  const { error } = await supabase.from("partner_applications").insert({
    profile_id: user.id,
    applicant_type: "tailor",
    full_name: fullName,
    phone,
    city_id: cityId,
    shop_name: shopName,
    address,
    specialities,
    daily_capacity: dailyCapacity,
    registration_fee: TAILOR_REGISTRATION_FEE,
  });

  if (error) {
    console.error("[submit-tailor-application]", error);
    throw new Error(
      error.code === "23505"
        ? "You already have a pending tailor application."
        : "Couldn't submit your application. Please try again."
    );
  }

  redirect("/tailor-registration?submitted=1");
}

export async function submitDeliveryApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = parseRequiredText(formData.get("full_name"), "Name");
  const phone = parseRequiredText(formData.get("phone"), "Phone");
  const cityId = parseRequiredText(formData.get("city_id"), "City");
  const vehicleType = parseRequiredText(formData.get("vehicle_type"), "Vehicle type");

  const { error } = await supabase.from("partner_applications").insert({
    profile_id: user.id,
    applicant_type: "delivery_partner",
    full_name: fullName,
    phone,
    city_id: cityId,
    vehicle_type: vehicleType,
    registration_fee: DELIVERY_REGISTRATION_FEE,
  });

  if (error) {
    console.error("[submit-delivery-application]", error);
    throw new Error(
      error.code === "23505"
        ? "You already have a pending delivery partner application."
        : "Couldn't submit your application. Please try again."
    );
  }

  redirect("/delivery-registration?submitted=1");
}
