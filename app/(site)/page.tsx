import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GarmentIcon, silhouetteFor } from "@/components/site/garment-icon";

const CATEGORY_COPY: Record<string, string> = {
  stitching: "A garment made to your measurements, from scratch.",
  alteration: "Something you already own, fitted properly.",
  repair: "A quick fix — a zip, a button, a seam.",
};

export default async function Home() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("category, garment_type, base_price")
    .eq("is_active", true)
    .order("sort_order");

  const byCategory = new Map<string, { garment_type: string; base_price: number }>();
  for (const s of services ?? []) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, s);
  }

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:py-20">
          <span className="font-mono text-xs uppercase tracking-wide text-indigo">
            Doorstep tailoring, Kanpur
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Your tailor, without the trip to the shop.
          </h1>
          <p className="max-w-lg text-lg text-ink-soft">
            Book a pickup, we take it to a verified local tailor, and bring it
            back stitched, altered, or repaired — no queue, no back-and-forth.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/book"
              className="rounded-full bg-indigo px-6 py-3 text-sm font-semibold text-paper hover:bg-indigo-strong"
            >
              Book your stitch
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink hover:border-indigo"
            >
              Browse services
            </Link>
          </div>
        </div>
      </section>

      {/* Category showcase */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-ink">
          What we stitch
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from(byCategory.entries()).map(([category, sample]) => (
            <Link
              key={category}
              href={`/services?category=${category}`}
              className="flex flex-col gap-3 rounded border border-line bg-paper p-6 hover:border-indigo"
            >
              <GarmentIcon
                type={silhouetteFor(sample.garment_type)}
                className="h-12 w-12 text-indigo"
              />
              <p className="font-display text-lg font-bold capitalize text-ink">
                {category}
              </p>
              <p className="text-sm text-ink-soft">
                {CATEGORY_COPY[category] ?? "Handled by a verified local tailor."}
              </p>
              <p className="font-mono text-sm text-ink-soft">
                From ₹{sample.base_price}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Registration CTAs */}
      <section className="border-t border-line-soft bg-paper">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2">
          <div className="rounded border border-line p-6">
            <p className="font-display text-lg font-bold text-ink">
              Are you a tailor?
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Join Stitchera and get orders delivered to your shop — no
              marketing, no walk-in dependency.
            </p>
            <Link
              href="/tailor-registration"
              className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:border-indigo"
            >
              Register as a tailor
            </Link>
          </div>
          <div className="rounded border border-line p-6">
            <p className="font-display text-lg font-bold text-ink">
              Deliver for Stitchera
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Pick up and deliver garments in your area, on your own schedule.
            </p>
            <Link
              href="/delivery-registration"
              className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:border-indigo"
            >
              Register as a delivery partner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
