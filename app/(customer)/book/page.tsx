import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { PAYMENT_PREFERENCE_LABELS, PAYMENT_PREFERENCES } from "@/lib/constants";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { DEFAULT_TAILORING_IMAGE } from "@/lib/garment-images";
import { createBooking } from "./actions";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; note?: string }>;
}) {
  const { service: preselectedService, note: prefilledNote } = await searchParams;

  // Generated once per page render, not per tap — every submission of this
  // same loaded form (including a double-tap, or a retry after a dropped
  // response on bad 4G) carries the same key, so create_order() can tell a
  // retry apart from a genuinely new booking.
  const idempotencyKey = crypto.randomUUID();

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
        .select("id, name, delivery_charge")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("measurements")
        .select("id, label, garment_type, person_name")
        .eq("profile_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

  // Same 8pm-6am IST window create_order() uses for the surge charge — a
  // heads-up here is honest and cheap; the actual amount charged is still
  // computed authoritatively server-side at booking time, not duplicated
  // as a live total on this page.
  const istHour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date())
  );
  const inSurgeWindow = istHour >= 20 || istHour < 6;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Book a service
        </h1>
        <form action={createBooking} className="flex flex-col gap-5">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <label className="flex flex-col gap-1 text-sm">
          City
          <select
            name="city_id"
            required
            className="rounded border border-line bg-paper px-3 py-2"
          >
            {cities?.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Service
          <select
            name="service_id"
            required
            defaultValue={preselectedService || services?.[0]?.id}
            className="rounded border border-line bg-paper px-3 py-2"
          >
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
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Measurements
          <select
            name="measurement_id"
            className="rounded border border-line bg-paper px-3 py-2"
          >
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
          <span className="text-xs text-ink-soft">
            <Link href="/measurements" className="text-indigo underline">
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
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Landmark (optional)
          <input
            type="text"
            name="address_landmark"
            placeholder="Near ..."
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Pincode
          <input
            type="text"
            name="address_pincode"
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contact phone
          <input
            type="tel"
            name="contact_phone"
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            How will you pay the advance?
          </legend>
          {PAYMENT_PREFERENCES.map((pref) => (
            <label key={pref} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="payment_preference"
                value={pref}
                defaultChecked={pref === "cod"}
              />
              {PAYMENT_PREFERENCE_LABELS[pref]}
            </label>
          ))}
          <p className="text-xs text-ink-soft">
            Online payment isn&apos;t live yet — either way, our team
            collects the advance directly and confirms it on your order.
          </p>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          Note (optional)
          <textarea
            name="customer_note"
            defaultValue={prefilledNote ?? ""}
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <SubmitButton
          pendingText="Placing booking..."
          className={buttonClass("primary", "md")}
        >
          Place booking
        </SubmitButton>
        </form>
      </div>

      <aside className="order-first flex flex-col gap-4 lg:order-none">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          {/* Stand-in photography — see lib/garment-images.ts for
              sourcing/credit. */}
          <Image
            src={DEFAULT_TAILORING_IMAGE}
            alt="A tailor at work stitching a garment"
            fill
            className="object-cover"
          />
        </div>

        <div className={`p-5 text-sm text-ink-soft ${cardClass}`}>
          <p className="font-medium text-ink">How this is charged</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            <li>Service price — set by the tailor</li>
            <li>Handling charge — ₹18 flat</li>
            <li>
              Surge charge — ₹10, only for bookings placed between 8pm–6am
              {inSurgeWindow && (
                <span className="ml-1 font-medium text-marigold-strong">
                  (applies right now)
                </span>
              )}
            </li>
            <li>Delivery charge — an estimate based on your city, confirmed at pickup</li>
          </ul>
          <p className="mt-3 border-t border-line-soft pt-3">
            Orders under ₹500 need 15% paid upfront; ₹500 and above need 30% —
            our team will confirm payment details after you book.
          </p>
        </div>
      </aside>
    </div>
  );
}
