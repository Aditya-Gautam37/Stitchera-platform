import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { submitTailorApplication } from "@/lib/actions/partner-applications";

export default async function TailorRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tailor-registration");

  const [{ data: profile }, { data: cities }, { data: pending }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
      supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("partner_applications")
        .select("id, status, created_at")
        .eq("profile_id", user.id)
        .eq("applicant_type", "tailor")
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
          We&apos;ll review your details and be in touch. A ₹199 registration
          fee applies once you&apos;re approved — our team will confirm
          payment details with you directly.
        </p>
      </div>
    );
  }

  if (pending?.status === "rejected") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">
          Register as a tailor
        </h1>
        <p className="mt-3 text-sm text-thread-red">
          Your previous application wasn&apos;t approved. You&apos;re welcome
          to apply again below.
        </p>
        <TailorForm profile={profile} cities={cities ?? []} />
      </div>
    );
  }

  if (pending?.status === "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">
          You&apos;re already a Stitchera tailor
        </h1>
        <p className="mt-3 text-ink-soft">
          Your application was approved — reach out on WhatsApp from the
          Contact page if you need anything.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">
        Register as a tailor
      </h1>
      <p className="mt-3 text-ink-soft">
        Join Stitchera and get orders delivered to your shop. A ₹199
        registration fee applies once approved.
      </p>
      <TailorForm profile={profile} cities={cities ?? []} />
    </div>
  );
}

function TailorForm({
  profile,
  cities,
}: {
  profile: { full_name: string | null; phone: string | null } | null;
  cities: { id: string; name: string }[];
}) {
  return (
    <form action={submitTailorApplication} className="mt-6 flex flex-col gap-4">
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
        <select name="city_id" required className="rounded border border-line bg-paper px-3 py-2">
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Shop name (optional)
        <input
          type="text"
          name="shop_name"
          className="rounded border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Shop address (optional)
        <input
          type="text"
          name="address"
          className="rounded border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Specialities (comma separated)
        <input
          type="text"
          name="specialities"
          placeholder="kurta, blouse, alteration"
          className="rounded border border-line bg-paper px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Garments you can take per day
        <input
          type="number"
          name="daily_capacity"
          min={1}
          defaultValue={5}
          className="rounded border border-line bg-paper px-3 py-2"
        />
      </label>
      <SubmitButton
        pendingText="Submitting..."
        className="w-fit rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong disabled:opacity-50"
      >
        Submit application
      </SubmitButton>
    </form>
  );
}
