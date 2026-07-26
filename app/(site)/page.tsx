import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GarmentIcon, silhouetteFor } from "@/components/site/garment-icon";

const HOW_IT_WORKS = [
  {
    step: "Book",
    description: "Pick a service and a pickup slot — takes under a minute.",
  },
  {
    step: "We pick up",
    description: "A Stitchera executive collects your garment and any notes from your door.",
  },
  {
    step: "Tailor stitches",
    description: "A verified local tailor makes or alters it, then it's quality checked.",
  },
  {
    step: "Delivered",
    description: "Back at your door, ready to wear.",
  },
] as const;

const TRUST_POINTS = [
  {
    title: "Verified tailors",
    description: "Every tailor on Stitchera is vetted and rated before they take your order.",
  },
  {
    title: "Checked before delivery",
    description: "Every garment is quality checked after stitching, before it comes back to you.",
  },
  {
    title: "We come to you",
    description: "Pickup and delivery at your door — no trip to a shop, no waiting in a queue.",
  },
  {
    title: "Measurements, saved once",
    description: "Save a measurement profile and every future order reuses it automatically.",
  },
] as const;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: services }, { count: activeTailors }, { count: activeServices }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, name_hi, garment_type, base_price, est_days")
        .eq("is_active", true)
        .order("sort_order")
        .limit(6),
      // public_tailors is the safe, column-limited view (0008) — a plain
      // customer/anon session has no SELECT policy on the base tailors
      // table at all.
      supabase.from("public_tailors").select("id", { count: "exact", head: true }),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line-soft bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-line px-3 py-1 font-mono text-xs uppercase tracking-wide text-indigo">
              Doorstep tailoring, Kanpur
            </span>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
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
                Book a pickup
              </Link>
              <Link
                href="/services"
                className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink hover:border-indigo"
              >
                Browse services
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {/* TODO: replace with real Kanpur tailor photography — a
                Stitchera pickup executive at a customer's doorstep. */}
            <Image
              src="/images/placeholders/hero-pickup.svg"
              alt="Placeholder photo of a Stitchera pickup executive collecting a garment at a customer's doorstep in Kanpur"
              fill
              priority
              unoptimized
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Category showcase — live from the catalog */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-ink">
          What we stitch
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Real prices, pulled straight from what we currently offer.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(services ?? []).map((service) => (
            <Link
              key={service.id}
              href={`/book?service=${service.id}`}
              className="group flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-indigo"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cotton">
                <GarmentIcon
                  type={silhouetteFor(service.garment_type)}
                  className="h-9 w-9 text-indigo"
                />
              </div>
              <div>
                <p className="font-display text-base font-bold text-ink">
                  {service.name}
                </p>
                {service.name_hi && (
                  <p className="font-devanagari text-sm text-ink-soft">
                    {service.name_hi}
                  </p>
                )}
              </div>
              <p className="mt-auto font-mono text-sm text-ink-soft">
                From ₹{service.base_price} · {service.est_days} day
                {service.est_days === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
        <Link
          href="/services"
          className="mt-6 inline-block text-sm font-medium text-indigo underline"
        >
          See all services →
        </Link>
      </section>

      {/* How Stitchera works */}
      <section className="border-y border-line-soft bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold text-ink">
            How Stitchera works
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-4">
            {HOW_IT_WORKS.map((item, i) => (
              <li key={item.step} className="relative flex flex-col gap-2">
                <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo font-mono text-sm font-medium text-paper">
                    {i + 1}
                  </span>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden h-px flex-1 bg-line sm:mt-5 sm:block sm:h-px sm:w-full"
                    />
                  )}
                </div>
                <p className="font-display text-lg font-bold text-ink">
                  {item.step}
                </p>
                <p className="text-sm text-ink-soft">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <div key={point.title}>
              <p className="font-display text-lg font-bold text-ink">
                {point.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest numbers — no invented testimonials while we have none yet */}
      <section className="border-y border-line-soft bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {activeTailors ?? "—"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">Verified tailors on Stitchera</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {activeServices ?? "—"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">Services offered</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">Kanpur</p>
              <p className="mt-1 text-sm text-ink-soft">Proudly serving, one city at a time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration CTAs */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-paper p-6">
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
          <div className="rounded-2xl border border-line bg-paper p-6">
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
