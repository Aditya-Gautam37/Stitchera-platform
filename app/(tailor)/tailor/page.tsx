import Link from "next/link";
import { requireTailor } from "@/lib/dal/tailor";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cardClass } from "@/components/ui/styles";
import { ORDER_STATUS_TONE, TAILOR_STATUS_TONE } from "@/lib/status-tone";

export default async function TailorOverviewPage() {
  const tailor = await requireTailor();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, promised_date")
    .eq("tailor_id", tailor.id)
    .order("placed_at", { ascending: false });

  const rows = orders ?? [];
  const needsWork = rows.filter((o) => o.status === "with_tailor");
  const active = rows.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled"
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          Welcome, {tailor.name}
          <Badge tone={TAILOR_STATUS_TONE[tailor.status] ?? "neutral"}>
            {tailor.status === "active" ? "Active" : tailor.status.replace("_", " ")}
          </Badge>
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 ${cardClass}`}>
          <p className="text-sm text-ink-soft">Needs stitching</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{needsWork.length}</p>
        </div>
        <div className={`p-4 ${cardClass}`}>
          <p className="text-sm text-ink-soft">Active orders</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{active.length}</p>
        </div>
        <div className={`p-4 ${cardClass}`}>
          <p className="text-sm text-ink-soft">All-time orders</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{rows.length}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink">With you now</h2>
        {!needsWork.length ? (
          <p className="mt-2 text-sm text-ink-soft">
            Nothing waiting on you right now.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft">
            {needsWork.map((o) => (
              <li key={o.id} className="py-2">
                <Link
                  href={`/tailor/orders/${o.id}`}
                  className="flex items-center justify-between text-sm text-ink transition-colors hover:text-indigo"
                >
                  <span className="flex items-center gap-2">
                    {o.order_number}
                    <Badge tone={ORDER_STATUS_TONE[o.status as OrderStatus]}>
                      {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                    </Badge>
                  </span>
                  {o.promised_date && (
                    <span className="text-ink-soft">
                      Due {new Date(o.promised_date).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/tailor/orders"
        className="w-fit text-sm font-medium text-indigo underline"
      >
        See all orders →
      </Link>
    </div>
  );
}
