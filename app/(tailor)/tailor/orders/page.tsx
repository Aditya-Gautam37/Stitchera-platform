import Link from "next/link";
import { requireTailor } from "@/lib/dal/tailor";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_TONE } from "@/lib/status-tone";

export default async function TailorOrdersPage() {
  const tailor = await requireTailor();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, promised_date, placed_at")
    .eq("tailor_id", tailor.id)
    .order("placed_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">
        Your orders
      </h1>
      {!orders?.length ? (
        <p className="text-sm text-ink-soft">No orders assigned yet.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {orders.map((o) => (
            <li key={o.id} className="py-3">
              <Link
                href={`/tailor/orders/${o.id}`}
                className="flex items-center justify-between text-sm text-ink transition-colors hover:text-indigo"
              >
                <span>{o.order_number}</span>
                <Badge tone={ORDER_STATUS_TONE[o.status as OrderStatus]}>
                  {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
