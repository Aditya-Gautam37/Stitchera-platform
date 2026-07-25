import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GarmentIcon, silhouetteFor } from "@/components/site/garment-icon";

const CATEGORY_COPY: Record<string, { label: string; hint: string }> = {
  stitching: {
    label: "Get something new made",
    hint: "From your fabric, to your measurements.",
  },
  alteration: {
    label: "Fix the fit of something you own",
    hint: "Resize, hem, refit.",
  },
  repair: {
    label: "Quick repair",
    hint: "Zip, button, hook, or a small fix.",
  },
};

const BUDGETS = [
  { value: "low", label: "Under ₹200", test: (p: number) => p < 200 },
  { value: "mid", label: "₹200 – ₹500", test: (p: number) => p >= 200 && p <= 500 },
  { value: "high", label: "Above ₹500", test: (p: number) => p > 500 },
] as const;

type ServiceRow = {
  id: string;
  name: string;
  category: string;
  garment_type: string;
  base_price: number;
  est_days: number;
};

export default async function StyleFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; budget?: string; fastest?: string }>;
}) {
  const { category, budget, fastest } = await searchParams;
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, garment_type, base_price, est_days")
    .eq("is_active", true)
    .order("sort_order");

  const rows = (services ?? []) as ServiceRow[];
  const categories = Array.from(new Set(rows.map((s) => s.category))).sort();
  const budgetChoice = BUDGETS.find((b) => b.value === budget);
  const showResult = Boolean(category && budgetChoice);

  let matches = showResult
    ? rows.filter(
        (s) => s.category === category && budgetChoice!.test(Number(s.base_price))
      )
    : [];

  if (fastest === "yes") {
    matches = [...matches].sort((a, b) => a.est_days - b.est_days);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-wide text-indigo">
        AI Assistance
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Find the right service
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Tell us what you need and what you&apos;d like to spend — matched
        against Stitchera&apos;s live catalog and prices.
      </p>

      <form className="mt-6 flex flex-col gap-6 rounded border border-line bg-paper p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            What do you need?
          </legend>
          <div className="flex flex-col gap-2">
            {categories.map((c) => {
              const copy = CATEGORY_COPY[c] ?? { label: c, hint: undefined };
              return (
                <label key={c} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    defaultChecked={category === c}
                    className="mt-1"
                    required
                  />
                  <span>
                    <span className="font-medium capitalize text-ink">
                      {copy.label}
                    </span>
                    {copy.hint && (
                      <span className="text-ink-soft"> — {copy.hint}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            What&apos;s your budget?
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {BUDGETS.map((b) => (
              <label key={b.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="budget"
                  value={b.value}
                  defaultChecked={budget === b.value}
                  required
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="fastest" value="yes" defaultChecked={fastest === "yes"} />
          Show fastest turnaround first
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Show my matches
        </button>
      </form>

      {showResult && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink">
            Matched for you
          </h2>

          {!matches.length ? (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing in that budget yet —{" "}
              <Link
                href={`/services?category=${category}`}
                className="text-indigo underline"
              >
                see all {category} services
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {matches.map((service) => (
                <li
                  key={service.id}
                  className="flex flex-col gap-3 rounded border border-line bg-paper p-4"
                >
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
                    href={`/book?service=${service.id}`}
                    className="mt-auto w-fit rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper hover:bg-indigo-strong"
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
