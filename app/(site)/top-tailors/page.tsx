import { createClient } from "@/lib/supabase/server";
import { StarDisplay } from "@/components/site/star-display";

export default async function TopTailorsPage() {
  const supabase = await createClient();

  // public_tailors is a view exposing only name/shop_name/specialities/
  // rating/total_orders — the base `tailors` table also holds phone numbers
  // and commission_pct, which stay staff-only regardless of this page.
  const { data: tailors } = await supabase
    .from("public_tailors")
    .select("id, name, shop_name, specialities, rating, total_orders")
    .gt("total_orders", 0)
    .order("rating", { ascending: false })
    .order("total_orders", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">
        Top tailors
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        The highest-rated tailors on Stitchera, based on completed orders.
      </p>

      {!tailors?.length ? (
        <p className="mt-8 text-sm text-ink-soft">
          No ranked tailors yet — ratings appear once tailors have completed
          orders with reviews.
        </p>
      ) : (
        <ol className="mt-6 flex flex-col divide-y divide-line-soft">
          {tailors.map((t, i) => (
            <li key={t.id} className="flex items-center gap-4 py-4">
              <span className="font-display text-xl font-bold text-ink-soft">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-ink">
                  {t.name}
                  {t.shop_name ? (
                    <span className="font-normal text-ink-soft"> · {t.shop_name}</span>
                  ) : null}
                </p>
                {!!t.specialities?.length && (
                  <p className="text-sm text-ink-soft">
                    {t.specialities.join(", ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <StarDisplay rating={Number(t.rating)} />
                <p className="text-xs text-ink-soft">
                  {t.total_orders} order{t.total_orders === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
