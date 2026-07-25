import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { submitDeliveryApplication } from "@/lib/actions/partner-applications";

const VEHICLE_TYPES = ["bicycle", "bike", "scooter", "other"];

export default async function DeliveryRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/delivery-registration");

  const [{ data: profile }, { data: cities }, { data: pending }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
      supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("partner_applications")
        .select("id, status")
        .eq("profile_id", user.id)
        .eq("applicant_type", "delivery_partner")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (submitted || pending?.status === "pending") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">
          Application received
        </h1>
        <p className="mt-3 text-ink-soft">
          We&apos;ll review your details and be in touch. A ₹79 registration
          fee applies once you&apos;re approved — our team will confirm
          payment details with you directly.
        </p>
      </div>
    );
  }

  if (pending?.status === "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">
          You&apos;re already a Stitchera delivery partner
        </h1>
        <p className="mt-3 text-ink-soft">
          Sign in and open your Dashboard to see assigned pickups.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">
        Register as a delivery partner
      </h1>
      <p className="mt-3 text-ink-soft">
        Pick up and deliver garments in your area. A ₹79 registration fee
        applies once approved.
      </p>
      {pending?.status === "rejected" && (
        <p className="mt-3 text-sm text-thread-red">
          Your previous application wasn&apos;t approved. You&apos;re welcome
          to apply again below.
        </p>
      )}
      <form
        action={submitDeliveryApplication}
        className="mt-6 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input
            type="text"
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            type="tel"
            name="phone"
            defaultValue={profile?.phone ?? ""}
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          City
          <select
            name="city_id"
            required
            className="rounded border border-line bg-paper px-3 py-2"
          >
            {(cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vehicle
          <select
            name="vehicle_type"
            required
            className="rounded border border-line bg-paper px-3 py-2"
          >
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton
          pendingText="Submitting..."
          className="w-fit rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong disabled:opacity-50"
        >
          Submit application
        </SubmitButton>
      </form>
    </div>
  );
}
