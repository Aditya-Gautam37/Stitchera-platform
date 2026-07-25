import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GarmentIcon, silhouetteFor } from "@/components/site/garment-icon";

type ServiceRow = {
  id: string;
  name: string;
  name_hi: string | null;
  category: string;
  garment_type: string;
  base_price: number;
  est_days: number;
};

const SORTS = {
  featured: { label: "Featured", column: "sort_order" as const, ascending: true },
  price_asc: { label: "Price: low to high", column: "base_price" as const, ascending: true },
  price_desc: { label: "Price: high to low", column: "base_price" as const, ascending: false },
  fastest: { label: "Fastest turnaround", column: "est_days" as const, ascending: true },
};
type SortKey = keyof typeof SORTS;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { q, category, sort: sortParam } = await searchParams;
  const sortKey: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "featured";
  const sort = SORTS[sortKey];

  const supabase = await createClient();

  const base = () =>
    supabase
      .from("services")
      .select("id, name, name_hi, category, garment_type, base_price, est_days")
      .eq("is_active", true)
      .order(sort.column, { ascending: sort.ascending });

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
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold text-ink">Services</h1>
        <p className="mt-4 text-sm text-thread-red">
          Failed to load services: {error.message}
        </p>
      </div>
    );
  }

  const categories = Array.from(new Set(services.map((s) => s.category))).sort();
  const filtered = category ? services.filter((s) => s.category === category) : services;

  const withParam = (key: string, value: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (sortParam) params.set("sort", sortParam);
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    return qs ? `/services?${qs}` : "/services";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Services</h1>
      {q && (
        <p className="mt-1 text-sm text-ink-soft">
          Showing results for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={withParam("category", null)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize ${
              !category
                ? "border-indigo bg-indigo text-paper"
                : "border-line text-ink-soft hover:border-indigo"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={withParam("category", c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize ${
                category === c
                  ? "border-indigo bg-indigo text-paper"
                  : "border-line text-ink-soft hover:border-indigo"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        <form className="flex items-center gap-2 text-sm">
          {q && <input type="hidden" name="q" value={q} />}
          {category && <input type="hidden" name="category" value={category} />}
          <label htmlFor="sort" className="text-ink-soft">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sortKey}
            className="rounded border border-line bg-paper px-2 py-1.5"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </form>
      </div>

      {!filtered.length ? (
        <p className="mt-8 text-sm text-ink-soft">
          No services matched — try a different search or category.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 rounded border border-line bg-paper p-4"
            >
              <GarmentIcon
                type={silhouetteFor(service.garment_type)}
                className="h-10 w-10 text-indigo"
              />
              <div>
                <p className="font-medium text-ink">{service.name}</p>
                <p className="text-sm text-ink-soft">
                  {service.est_days} day{service.est_days === 1 ? "" : "s"} turnaround
                </p>
              </div>
              <p className="mt-auto font-mono text-lg font-medium text-ink">
                ₹{service.base_price}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
