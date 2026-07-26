import Image from "next/image";
import Link from "next/link";
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

// Search audit findings (12-service catalog, effort capped per the RC1
// brief): case-insensitivity and partial-substring matching already work
// as-is — ILIKE is inherently case-insensitive, and "%term%" already does
// substring matching. Two real, simple gaps fixed here: the query was
// never trimmed (a trailing space from a mobile keyboard silently breaks
// an otherwise-correct search), and name_hi was never searched at all, so
// typing a service's Hindi name returned nothing despite the data being
// right there. Pluralization ("kurtas" not matching "Kurta Stitching") is
// also simple enough to fix with one extra literal variant — anything
// beyond that (stemming, fuzzy/pg_trgm matching) would be over-engineering
// for this catalog size and is logged as a MEDIUM follow-up instead.
function searchTermVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const variants = new Set([trimmed]);
  if (trimmed.length > 3 && trimmed.toLowerCase().endsWith("s")) {
    variants.add(trimmed.slice(0, -1));
  } else {
    variants.add(`${trimmed}s`);
  }
  return Array.from(variants);
}

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

  const terms = q ? searchTermVariants(q) : [];

  if (terms.length) {
    // Separate .ilike() calls per column per term variant, merged in JS,
    // rather than a hand-built .or() filter string — see the admin
    // customer-search fix: interpolating raw input into PostgREST's filter
    // DSL lets punctuation in the search box alter which clauses get
    // parsed, not just what they match.
    const results = await Promise.all(
      terms.flatMap((term) => [
        base().ilike("name", `%${term}%`),
        base().ilike("name_hi", `%${term}%`),
        base().ilike("category", `%${term}%`),
      ])
    );
    error = results.find((r) => r.error)?.error;
    const merged = new Map<string, ServiceRow>();
    for (const r of results) {
      for (const row of r.data ?? []) merged.set(row.id, row);
    }
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
            className={`rounded-full border px-3.5 py-3 text-sm font-medium capitalize ${
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
              className={`rounded-full border px-3.5 py-3 text-sm font-medium capitalize ${
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
            className="rounded border border-line bg-paper px-2 py-3"
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
            <li key={service.id}>
              <Link
                href={`/book?service=${service.id}`}
                className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-paper transition-colors hover:border-indigo"
              >
                <div className="relative aspect-[4/3] w-full">
                  {/* TODO: real photography of this garment — real Indian
                      tailoring, real fabric and machines, natural light,
                      no generic corporate stock. */}
                  <Image
                    src="/images/placeholders/finished-garment.svg"
                    alt={`Placeholder photo — ${service.name}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 px-5 pb-5">
                  <p className="font-display font-bold text-ink">{service.name}</p>
                  {service.name_hi && (
                    <p className="font-devanagari text-sm text-ink-soft">
                      {service.name_hi}
                    </p>
                  )}
                  <p className="mt-auto font-mono text-base font-medium text-ink">
                    From ₹{service.base_price}
                  </p>
                  <p className="text-sm text-ink-soft">
                    Ready in {service.est_days} day{service.est_days === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
