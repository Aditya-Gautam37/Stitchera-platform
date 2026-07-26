import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonClass, cardClass } from "@/components/ui/styles";

const HOW_IT_WORKS = [
  {
    step: "Book",
    description: "Pick a service and a pickup slot — takes under a minute.",
  },
  {
    step: "Pickup",
    description: "A Stitchera executive collects your garment and any notes from your door.",
  },
  {
    step: "Stitch",
    description: "A verified local tailor makes or alters it, then it's quality checked.",
  },
  {
    step: "Deliver",
    description: "Back at your door, ready to wear.",
  },
] as const;

const TRUST_POINTS = [
  {
    title: "Verified tailors",
    description: "Every tailor on Stitchera is vetted before they take your order.",
  },
  {
    title: "Doorstep pickup",
    description: "We collect and return at your door — no trip to a shop, no queue.",
  },
  {
    title: "Secure payments",
    description: "Every payment is recorded and confirmed by our team, never informal.",
  },
  {
    title: "Saved measurements",
    description: "Save a measurement profile once and every future order reuses it.",
  },
] as const;

export default async function Home() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, name_hi, garment_type, base_price, est_days")
    .eq("is_active", true)
    .order("sort_order")
    .limit(6);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line-soft bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-line px-3 py-1 font-mono text-xs uppercase tracking-wide text-indigo">
              Doorstep tailoring, Kanpur
            </span>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Tailoring, without the tailor shop.
            </h1>
            <p className="max-w-lg text-lg text-ink-soft">
              Book a service, we pick it up, a verified local tailor stitches
              it, and we deliver it back to your door.
            </p>

            <form action="/services" className="flex max-w-md gap-2 pt-2">
              <input
                type="text"
                name="q"
                placeholder="Search kurta, blouse…"
                className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm text-ink placeholder:text-ink-soft"
              />
              <button type="submit" className={`shrink-0 ${buttonClass("primary", "lg")}`}>
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link href="/book" className={buttonClass("primary", "lg")}>
                Book a pickup
              </Link>
              <Link href="/services" className={buttonClass("secondary", "lg")}>
                Browse services
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {/* TODO: real photography — a Stitchera pickup executive at a
                customer's doorstep in Kanpur. Brand rule: real Indian
                tailoring, real fabric and machines, natural light, no
                generic corporate stock. */}
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
        {!services?.length ? (
          <p className="mt-6 text-sm text-ink-soft">
            Nothing to show yet — check back soon.
          </p>
        ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/book?service=${service.id}`}
              className={`flex flex-col gap-3 overflow-hidden transition-colors hover:border-indigo ${cardClass}`}
            >
              <div className="relative aspect-[4/3] w-full">
                {/* TODO: real photography of this garment — real Indian
                    tailoring, real fabric and machines, natural light, no
                    generic corporate stock. */}
                <Image
                  src="/images/placeholders/finished-garment.svg"
                  alt={`Placeholder photo — ${service.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 px-4 pb-4">
                <p className="font-display text-base font-bold text-ink">
                  {service.name}
                </p>
                {service.name_hi && (
                  <p className="font-devanagari text-sm text-ink-soft">
                    {service.name_hi}
                  </p>
                )}
                {/* Split across two lines — measured: "From ₹650 · Ready
                    in 5 days" in font-mono overflows a 2-column mobile
                    card's ~156px width at 360px viewport and wraps
                    mid-phrase. */}
                <p className="mt-auto font-mono text-sm text-ink-soft">
                  From ₹{service.base_price}
                </p>
                <p className="font-mono text-xs text-ink-soft">
                  Ready in {service.est_days} day
                  {service.est_days === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
        )}
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
          <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
            {HOW_IT_WORKS.map((item, i) => (
              <li key={item.step} className="relative flex flex-col gap-2">
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo font-mono text-sm font-medium text-paper">
                    {i + 1}
                  </span>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden h-px flex-1 bg-line md:mt-5 md:block md:h-px md:w-full"
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

      {/* Registration CTAs */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2">
          <div className={`p-6 ${cardClass}`}>
            <p className="font-display text-lg font-bold text-ink">
              Are you a tailor?
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Join Stitchera and get orders delivered to your shop — no
              marketing, no walk-in dependency.
            </p>
            <Link
              href="/tailor-registration"
              className={`mt-4 ${buttonClass("secondary", "sm")}`}
            >
              Register as a tailor
            </Link>
          </div>
          <div className={`p-6 ${cardClass}`}>
            <p className="font-display text-lg font-bold text-ink">
              Deliver for Stitchera
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Pick up and deliver garments in your area, on your own schedule.
            </p>
            <Link
              href="/delivery-registration"
              className={`mt-4 ${buttonClass("secondary", "sm")}`}
            >
              Register as a delivery partner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
