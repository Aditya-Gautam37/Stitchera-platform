const PLANS = [
  { name: "Karigar", tagline: "Skilled artisan" },
  { name: "Ustad", tagline: "Master craftsman" },
  { name: "Meher", tagline: "Grace & elegance" },
  { name: "Shahi", tagline: "Royal luxury" },
];

export default function SubscriptionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <span className="font-mono text-xs uppercase tracking-wide text-indigo">
        Phase F
      </span>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">
        Subscription plans
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        Pricing and checkout for each tier land in Phase F. Names are locked in:
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PLANS.map((plan) => (
          <div key={plan.name} className="rounded border border-line bg-paper p-4">
            <p className="font-display font-bold text-ink">{plan.name}</p>
            <p className="mt-1 text-xs text-ink-soft">{plan.tagline}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
