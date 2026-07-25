import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { createBooking } from "./actions";

export default async function BookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: services }, { data: cities }, { data: measurements }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, base_price, est_days")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("cities")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("measurements")
        .select("id, label, garment_type, person_name")
        .eq("profile_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Book a service</h1>
      <form action={createBooking} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          City
          <select name="city_id" required className="rounded border px-3 py-2">
            {cities?.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Service
          <select name="service_id" required className="rounded border px-3 py-2">
            {services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — ₹{service.base_price} ({service.est_days} days)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Quantity
          <input
            type="number"
            name="qty"
            min={1}
            max={20}
            defaultValue={1}
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Measurements
          <select name="measurement_id" className="rounded border px-3 py-2">
            <option value="">
              {measurements?.length
                ? "Our team will take them at pickup"
                : "Our team will take them at pickup (none saved yet)"}
            </option>
            {measurements?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.garment_type}
                {m.person_name ? ` (${m.person_name})` : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            <Link href="/measurements" className="underline">
              Manage saved measurements
            </Link>
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            type="text"
            name="address_line"
            placeholder="House no, street, area"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Landmark (optional)
          <input
            type="text"
            name="address_landmark"
            placeholder="Near ..."
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Pincode
          <input
            type="text"
            name="address_pincode"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contact phone
          <input
            type="tel"
            name="contact_phone"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Note (optional)
          <textarea name="customer_note" className="rounded border px-3 py-2" />
        </label>

        <SubmitButton
          pendingText="Placing booking..."
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Place booking
        </SubmitButton>
      </form>
    </div>
  );
}
