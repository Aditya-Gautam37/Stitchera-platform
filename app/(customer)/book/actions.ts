"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_PREFERENCES, type PaymentPreference } from "@/lib/constants";

export async function createBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceId = formData.get("service_id") as string | null;
  const cityId = formData.get("city_id") as string | null;
  const qty = Number(formData.get("qty") ?? 1);
  const addressLine = formData.get("address_line") as string | null;
  const addressLandmark = formData.get("address_landmark") as string | null;
  const addressPincode = formData.get("address_pincode") as string | null;
  const contactPhone = formData.get("contact_phone") as string | null;
  const customerNote = formData.get("customer_note") as string | null;
  const measurementId =
    (formData.get("measurement_id") as string | null) || null;
  const paymentPreferenceRaw = formData.get("payment_preference") as string | null;
  const paymentPreference: PaymentPreference = PAYMENT_PREFERENCES.includes(
    paymentPreferenceRaw as PaymentPreference
  )
    ? (paymentPreferenceRaw as PaymentPreference)
    : "cod";

  if (!serviceId || !cityId) {
    throw new Error("Please choose a service and a city");
  }

  // All further validation (qty bounds, pincode format, address/phone
  // length, city/service availability, rate limiting, the 3-free-bookings
  // cap, and authoritative pricing) happens inside the create_order()
  // database function — one transaction, so a customer never ends up with
  // an order that has no items or a total that doesn't match what's in
  // the cart.
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_service_id: serviceId,
    p_city_id: cityId,
    p_qty: Number.isFinite(qty) ? qty : 0,
    p_address_line: addressLine,
    p_address_landmark: addressLandmark,
    p_address_pincode: addressPincode,
    p_contact_phone: contactPhone,
    p_customer_note: customerNote,
    p_measurement_id: measurementId,
    p_payment_preference: paymentPreference,
  });

  if (error || !orderId) {
    // ST001 is create_order()'s custom code specifically for "you've hit
    // the free-booking cap" — worth its own redirect rather than dumping
    // the customer into the generic error boundary with no next step.
    if (error?.code === "ST001") {
      redirect("/subscriptions?reason=cap");
    }

    console.error("[create-booking]", error);
    // create_order()'s own RAISE EXCEPTION messages (unadorned, so Postgres
    // tags them SQLSTATE P0001) are written to be shown to the customer
    // verbatim. Anything else — a real Postgres/PostgREST error, a type
    // mismatch, a constraint violation — is internal detail and shouldn't
    // reach the browser.
    const message =
      error?.code === "P0001"
        ? error.message
        : "Couldn't place your booking. Please try again.";
    throw new Error(message);
  }

  redirect(`/orders/${orderId}`);
}
