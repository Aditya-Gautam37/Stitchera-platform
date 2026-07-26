import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GarmentIcon, silhouetteFor } from "@/components/site/garment-icon";
import { buttonClass, cardClass } from "@/components/ui/styles";

const FIT_OPTIONS = [
  { value: "fitted", label: "Fitted", hint: "Close to the body, a tailored silhouette." },
  { value: "regular", label: "Regular", hint: "Comfortable with room to move — most popular." },
  { value: "relaxed", label: "Relaxed", hint: "Loose and breathable, best for daily wear." },
] as const;

type ServiceRow = {
  id: string;
  name: string;
  garment_type: string;
  base_price: number;
  est_days: number;
};

export default async function BodyTypePage({
  searchParams,
}: {
  searchParams: Promise<{ garment?: string; fit?: string; measured?: string }>;
}) {
  const { garment, fit, measured } = await searchParams;
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, garment_type, base_price, est_days")
    .eq("is_active", true)
    .order("sort_order");

  const rows = (services ?? []) as ServiceRow[];
  const garmentTypes = Array.from(
    new Set(rows.map((s) => s.garment_type).filter((g) => g !== "any"))
  ).sort();

  const fitChoice = FIT_OPTIONS.find((f) => f.value === fit);
  const showResult = Boolean(garment && fitChoice);

  const matches = showResult
    ? rows.filter((s) => s.garment_type === garment || s.garment_type === "any")
    : [];

  let savedMeasurementsCount = 0;
  if (showResult) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase
        .from("measurements")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("garment_type", garment)
        .eq("is_active", true);
      savedMeasurementsCount = count ?? 0;
    }
  }

  const note = fitChoice
    ? `Fit preference: ${fitChoice.label}. ${
        measured === "yes"
          ? "I have measurements saved for this."
          : "Please take my measurements at pickup."
      }`
    : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-wide text-indigo">
        AI Assistance
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Know your fit
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        A couple of quick questions, matched straight against our own
        catalog — no upload, no wait.
      </p>

      <form className={`mt-6 flex flex-col gap-6 p-5 ${cardClass}`}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            What are you getting made or altered?
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {garmentTypes.map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="garment"
                  value={g}
                  defaultChecked={garment === g}
                  required
                />
                {g}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            How do you like it to fit?
          </legend>
          <div className="flex flex-col gap-2">
            {FIT_OPTIONS.map((f) => (
              <label key={f.value} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="fit"
                  value={f.value}
                  defaultChecked={fit === f.value}
                  className="mt-1"
                  required
                />
                <span>
                  <span className="font-medium text-ink">{f.label}</span>{" "}
                  <span className="text-ink-soft">— {f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="measured"
            value="yes"
            defaultChecked={measured === "yes"}
          />
          I already have measurements saved for this
        </label>

        <button type="submit" className={`w-fit ${buttonClass("primary", "sm")}`}>
          Show my matches
        </button>
      </form>

      {showResult && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink capitalize">
            {fitChoice!.label} {garment} — recommended services
          </h2>

          {savedMeasurementsCount > 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              You have {savedMeasurementsCount} saved measurement profile
              {savedMeasurementsCount === 1 ? "" : "s"} for {garment} —{" "}
              <Link href="/measurements" className="text-indigo underline">
                reuse one at booking
              </Link>
              .
            </p>
          )}

          {!matches.length ? (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing in this category yet —{" "}
              <Link href="/services" className="text-indigo underline">
                browse all services
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {matches.map((service) => (
                <li key={service.id} className={`flex flex-col gap-3 p-4 ${cardClass}`}>
                  <GarmentIcon
                    type={silhouetteFor(service.garment_type)}
                    className="h-9 w-9 text-indigo"
                  />
                  <div>
                    <p className="font-medium text-ink">{service.name}</p>
                    <p className="text-sm text-ink-soft">
                      {service.est_days} day{service.est_days === 1 ? "" : "s"}{" "}
                      · ₹{service.base_price}
                    </p>
                  </div>
                  <Link
                    href={`/book?service=${service.id}&note=${encodeURIComponent(note)}`}
                    className={`mt-auto w-fit ${buttonClass("primary", "sm")}`}
                  >
                    Book this
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
