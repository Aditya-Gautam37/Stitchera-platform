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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-sm text-zinc-500">{profile?.phone}</p>
      </div>

      <Link
        href="/book"
        className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
      >
        Book a service
      </Link>

      <div>
        <h2 className="text-lg font-medium">Recent orders</h2>
        {!orders?.length ? (
          <p className="mt-2 text-sm text-zinc-500">
            No orders yet — book your first one!
          </p>
        ) : (
          <ul className="mt-2 divide-y">
            {orders.map((order) => (
              <li key={order.id} className="py-3">
                <Link href={`/orders/${order.id}`} className="flex justify-between">
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
