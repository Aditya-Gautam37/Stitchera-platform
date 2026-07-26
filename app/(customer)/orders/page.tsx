import Link from "next/link";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total, placed_at")
    .eq("customer_id", user!.id)
    .order("placed_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink">Your orders</h1>
      {!orders?.length ? (
        <p className="text-sm text-ink-soft">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {orders.map((order) => (
            <li key={order.id} className="py-3">
              <Link
                href={`/orders/${order.id}`}
                className="flex justify-between text-sm text-ink hover:text-indigo"
              >
                <span>
                  {order.order_number} ·{" "}
                  {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                </span>
                <span className="font-medium">₹{order.grand_total}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
