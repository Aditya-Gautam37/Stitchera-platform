import Link from "next/link";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .single();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total")
    .eq("customer_id", user!.id)
    .order("placed_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-sm text-ink-soft">{profile?.phone}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/book"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Book a service
        </Link>
        <Link
          href="/measurements"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-indigo"
        >
          My measurements
        </Link>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-ink">Recent orders</h2>
        {!orders?.length ? (
          <p className="mt-2 text-sm text-ink-soft">
            No orders yet — book your first one!
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft">
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
    </div>
  );
}
