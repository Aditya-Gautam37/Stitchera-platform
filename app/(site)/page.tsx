import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonClass } from "@/components/ui/styles";

const JOURNEY = [
  ["01", "सेवा चुनें", "Stitching, alteration या measurement"],
  ["02", "पिकअप बुक करें", "समय और घर का पता चुनें"],
  ["03", "कपड़ा + नाप", "Stitchera साथी सुरक्षित collection करे"],
  ["04", "Verified tailor", "ऑर्डर सही local tailor को allocate हो"],
  ["05", "Quality check", "फिट, finishing और निर्देश verify हों"],
  ["06", "घर पर delivery", "Track करें, approve करें, फिर पहनें"],
] as const;

const NETWORK = [
  { value: "1", label: "City office", note: "हर शहर में operations hub" },
  { value: "1", label: "City manager", note: "पूरे network की जवाबदेही" },
  { value: "2–5", label: "Pickup partners", note: "Collection और delivery" },
  { value: "20–100", label: "Verified tailors", note: "Skill-based allocation" },
] as const;

const PANELS = [
  { eyebrow: "CUSTOMER", title: "हर ऑर्डर पर पूरा नियंत्रण", items: ["Order history", "Saved measurements", "Payments", "Live tracking"], href: "/dashboard" },
  { eyebrow: "TAILOR", title: "काम, कमाई और reputation", items: ["Assigned orders", "Earnings", "Deadlines", "Ratings"], href: "/tailor" },
  { eyebrow: "CITY OFFICE", title: "स्थानीय operations का command centre", items: ["Pickup assignment", "Delivery assignment", "Tailor allocation", "Quality check"], href: "/admin/orders" },
  { eyebrow: "HEAD OFFICE", title: "कानपुर से पूरे network की visibility", items: ["State & city reports", "Revenue", "Verification", "Franchise control"], href: "/admin" },
] as const;

const PHASES = [
  { phase: "PHASE 01", window: "0–3 महीने", title: "Kanpur pilot", metric: "50 tailors · 2 pickup partners · 1 office", goal: "एक city में booking से delivery तक reliable operating loop बनाना।", build: ["Customer booking + tracking", "Tailor onboarding & verification", "Office allocation board", "Payments + basic reports"] },
  { phase: "PHASE 02", window: "4–8 महीने", title: "UP city expansion", metric: "Lucknow · Gorakhpur · Varanasi · Prayagraj", goal: "Kanpur playbook को repeatable city-office model में बदलना।", build: ["City manager dashboard", "Route & pickup capacity", "Quality scorecards", "City-wise P&L"] },
  { phase: "PHASE 03", window: "9–18 महीने", title: "Franchise & scale", metric: "Multi-state network · premium supply", goal: "Central control के साथ local ownership और नई revenue lines खोलना।", build: ["Franchise control centre", "Premium tailor membership", "Fabric marketplace", "State-wise analytics"] },
] as const;

const REVENUE = ["सिलाई पर commission", "Home visit charge", "Pickup & delivery fee", "Premium tailor membership", "Franchise fee", "Stitchera fabric brand"] as const;

export default async function Home() {
  const supabase = await createClient();
  const { data: services } = await supabase.from("services").select("id, name, name_hi, base_price, est_days").eq("is_active", true).order("sort_order").limit(4);

  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-line-soft bg-paper">
        <div className="hero-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo/25 bg-indigo/5 px-3 py-1.5 text-xs font-semibold text-indigo">
              <span className="h-2 w-2 rounded-full bg-marigold" /> कानपुर में doorstep tailoring
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl">
              आपका कपड़ा।<br /><span className="text-indigo">हमारी ज़िम्मेदारी।</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink-soft">घर से pickup, verified local tailor से सिलाई, quality check और doorstep delivery—सब एक भरोसेमंद network में।</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/book" className={buttonClass("primary", "lg")}>पिकअप बुक करें <span aria-hidden="true">→</span></Link>
              <Link href="/track" className={buttonClass("secondary", "lg")}>ऑर्डर ट्रैक करें</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-soft">
              <span>✓ Verified tailors</span><span>✓ Saved measurements</span><span>✓ Quality checked</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-marigold/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-line bg-cotton p-4 shadow-[0_24px_80px_rgba(28,27,51,.12)] sm:p-6">
              <div className="flex items-center justify-between border-b border-line-soft pb-5">
                <div><p className="font-mono text-[11px] uppercase tracking-[.18em] text-ink-soft">Live order</p><p className="mt-1 font-display text-xl font-bold">Blouse stitching</p></div>
                <span className="rounded-full bg-marigold/20 px-3 py-1.5 text-xs font-semibold text-marigold-ink">In progress</span>
              </div>
              <div className="py-6">
                <div className="relative flex justify-between">
                  <div className="absolute left-5 right-5 top-5 h-px bg-line" />
                  {["Pickup", "Tailor", "QC", "Delivery"].map((label, index) => (
                    <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold ${index < 2 ? "border-indigo bg-indigo text-paper" : "border-line bg-paper text-ink-soft"}`}>{index < 2 ? "✓" : index + 1}</span>
                      <span className="text-xs font-medium text-ink-soft">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-paper p-4"><p className="text-xs text-ink-soft">Tailor</p><p className="mt-1 font-semibold">Shabana Boutique</p><p className="mt-2 text-xs text-marigold-strong">★ 4.9 · Verified</p></div>
                <div className="rounded-2xl bg-indigo p-4 text-paper"><p className="text-xs text-paper/70">Expected delivery</p><p className="mt-1 font-semibold">Friday, 6:00 PM</p><p className="mt-2 text-xs text-paper/70">Order #ST-2048</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line-soft bg-indigo text-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-paper/15 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {NETWORK.map((item) => <div key={item.label} className="px-4 py-7 first:pl-0 lg:px-7"><p className="font-display text-3xl font-bold">{item.value}</p><p className="mt-1 text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-paper/60">{item.note}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl"><p className="section-kicker">CUSTOMER JOURNEY</p><h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">बुकिंग से delivery तक, हर कदम साफ़।</h2><p className="mt-5 text-lg leading-8 text-ink-soft">एक accountable chain—customer, pickup partner, tailor और quality team एक ही order पर जुड़े।</p></div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line-soft bg-line-soft md:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map(([number, title, description]) => <li key={number} className="group bg-paper p-6 transition-colors hover:bg-indigo hover:text-paper sm:p-8"><span className="font-mono text-xs text-marigold-strong group-hover:text-marigold">{number}</span><h3 className="mt-8 font-display text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft group-hover:text-paper/70">{description}</p></li>)}
        </ol>
      </section>

      {services?.length ? <section className="border-y border-line-soft bg-paper"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="section-kicker">POPULAR SERVICES</p><h2 className="mt-3 font-display text-3xl font-bold">आज क्या सिलवाना है?</h2></div><Link href="/services" className="text-sm font-semibold text-indigo">सभी सेवाएँ देखें →</Link></div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((service, index) => <Link key={service.id} href={`/book?service=${service.id}`} className="rounded-3xl border border-line-soft bg-cotton p-6 transition hover:-translate-y-1 hover:border-indigo"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo/10 text-sm font-bold text-indigo">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-8 font-display text-lg font-bold">{service.name_hi || service.name}</h3>{service.name_hi && <p className="mt-1 text-sm text-ink-soft">{service.name}</p>}<div className="mt-6 flex items-end justify-between border-t border-line-soft pt-4"><span className="font-mono text-sm">₹{service.base_price} से</span><span className="text-xs text-ink-soft">{service.est_days} दिन</span></div></Link>)}</div>
      </div></section> : null}

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div className="lg:sticky lg:top-36 lg:self-start"><p className="section-kicker">ONE PLATFORM · FOUR VIEWS</p><h2 className="mt-4 font-display text-4xl font-bold tracking-tight">हर role को सिर्फ वही दिखे जो काम का है।</h2><p className="mt-5 leading-7 text-ink-soft">Head Office कानपुर से policy और performance संभाले; city team ground operations चलाए।</p></div>
          <div className="grid gap-4 sm:grid-cols-2">{PANELS.map((panel) => <Link key={panel.eyebrow} href={panel.href} className="rounded-3xl border border-line-soft bg-paper p-7 transition hover:border-indigo"><p className="font-mono text-[11px] tracking-[.16em] text-indigo">{panel.eyebrow}</p><h3 className="mt-5 font-display text-xl font-bold">{panel.title}</h3><ul className="mt-6 space-y-3 border-t border-line-soft pt-5 text-sm text-ink-soft">{panel.items.map((item) => <li key={item}>— {item}</li>)}</ul></Link>)}</div>
        </div>
      </section>

      <section id="roadmap" className="bg-ink py-20 text-paper lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl"><p className="font-mono text-xs tracking-[.18em] text-marigold">BUILD ROADMAP</p><h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">तीन phases में एक शहर से पूरे भारत तक।</h2></div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">{PHASES.map((phase, index) => <article key={phase.phase} className={`rounded-3xl border p-7 ${index === 0 ? "border-marigold bg-paper text-ink" : "border-paper/15 bg-paper/5"}`}><div className="flex items-center justify-between"><span className={`font-mono text-xs tracking-[.14em] ${index === 0 ? "text-indigo" : "text-marigold"}`}>{phase.phase}</span><span className={`rounded-full px-3 py-1 text-xs ${index === 0 ? "bg-indigo/10 text-indigo" : "bg-paper/10 text-paper/70"}`}>{phase.window}</span></div><h3 className="mt-8 font-display text-2xl font-bold">{phase.title}</h3><p className={`mt-2 text-xs font-semibold ${index === 0 ? "text-marigold-strong" : "text-marigold"}`}>{phase.metric}</p><p className={`mt-5 text-sm leading-6 ${index === 0 ? "text-ink-soft" : "text-paper/65"}`}>{phase.goal}</p><ul className={`mt-7 space-y-3 border-t pt-5 text-sm ${index === 0 ? "border-line-soft text-ink-soft" : "border-paper/15 text-paper/70"}`}>{phase.build.map((item) => <li key={item}>✓ {item}</li>)}</ul></article>)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div><p className="section-kicker">BUSINESS ENGINE</p><h2 className="mt-4 font-display text-4xl font-bold tracking-tight">हर order से value, हर city से scale.</h2><p className="mt-5 max-w-lg leading-7 text-ink-soft">पहले core service economics साबित होंगे। फिर membership, franchise और fabric brand नए growth engines बनेंगे।</p></div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line-soft bg-line-soft">{REVENUE.map((item, index) => <div key={item} className="bg-paper p-5 sm:p-6"><span className="font-mono text-xs text-indigo">0{index + 1}</span><p className="mt-7 text-sm font-semibold">{item}</p></div>)}</div>
      </section>

      <section className="mx-4 mb-8 overflow-hidden rounded-[2rem] bg-indigo text-paper sm:mx-6 lg:mx-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:py-16"><div><p className="font-mono text-xs tracking-[.16em] text-marigold">KANPUR PILOT IS LIVE</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl">आपका अगला perfect-fit outfit, घर से शुरू होता है।</h2></div><Link href="/book" className="inline-flex shrink-0 items-center justify-center rounded-full bg-marigold px-7 py-3.5 text-sm font-bold text-marigold-ink transition hover:bg-paper">अभी पिकअप बुक करें →</Link></div>
      </section>
    </div>
  );
}
