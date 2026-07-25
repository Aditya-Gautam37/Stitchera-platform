import { createClient } from "@/lib/supabase/server";

type ServiceRow = {
  id: string;
  name: string;
  name_hi: string | null;
  category: string;
  garment_type: string;
  base_price: number;
  est_days: number;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const base = () =>
    supabase
      .from("services")
      .select("id, name, name_hi, category, garment_type, base_price, est_days")
      .eq("is_active", true)
      .order("sort_order");

  let services: ServiceRow[] = [];
  let error;

  if (q) {
    // Two separate .ilike() calls rather than a hand-built .or() filter
    // string — see the admin customer-search fix: interpolating raw input
    // into PostgREST's filter DSL lets punctuation in the search box alter
    // which clauses get parsed, not just what they match.
    const [byName, byCategory] = await Promise.all([
      base().ilike("name", `%${q}%`),
      base().ilike("category", `%${q}%`),
    ]);
    error = byName.error ?? byCategory.error;
    const merged = new Map<string, ServiceRow>(
      [...(byName.data ?? []), ...(byCategory.data ?? [])].map((s) => [s.id, s])
    );
    services = Array.from(merged.values());
  } else {
    const result = await base();
    services = result.data ?? [];
    error = result.error;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-ink">Services</h1>
        <p className="mt-4 text-sm text-thread-red">
          Failed to load services: {error.message}
        </p>
      </div>
    );
  }

  const grouped = new Map<string, ServiceRow[]>();
  for (const s of services) {
    const list = grouped.get(s.category) ?? [];
    list.push(s);
    grouped.set(s.category, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Services</h1>
      {q && (
        <p className="mt-1 text-sm text-ink-soft">
          Showing results for &ldquo;{q}&rdquo;
        </p>
      )}

      {!services.length ? (
        <p className="mt-6 text-sm text-ink-soft">
          No services matched — try a different search.
        </p>
      ) : (
        Array.from(grouped.entries()).map(([category, list]) => (
          <div key={category} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo">
              {category}
            </h2>
            <ul className="mt-3 divide-y divide-line-soft">
              {list.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-ink">{service.name}</p>
                    <p className="text-sm text-ink-soft">
                      {service.garment_type} · {service.est_days} days
                    </p>
                  </div>
                  <p className="font-mono font-medium text-ink">
                    ₹{service.base_price}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
