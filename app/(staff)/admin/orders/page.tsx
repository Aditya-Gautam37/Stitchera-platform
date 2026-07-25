import Link from "next/link";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; page?: string }>;
}) {
  const profile = await requireStaff();
  const { status, mine, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS scopes rows to the caller's city for city_manager/pickup_agent,
  // and to every city for admin — no explicit city filter needed here.
  let query = supabase
    .from("orders")
    .select("id, order_number, status, grand_total, contact_phone, placed_at", {
      count: "exact",
    })
    .order("placed_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (mine === "1") query = query.eq("pickup_agent_id", profile.id);

  const { data: orders, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (mine === "1") params.set("mine", "1");
    params.set("page", String(p));
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <form className="flex items-center gap-3 text-sm">
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded border px-2 py-1"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {profile.role === "pickup_agent" && (
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                name="mine"
                value="1"
                defaultChecked={mine === "1"}
              />
              Assigned to me
            </label>
          )}
          <button type="submit" className="rounded border px-3 py-1">
            Filter
          </button>
        </form>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-2 font-medium">Order</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Contact</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders?.map((o) => (
            <tr key={o.id}>
              <td className="py-2">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-medium hover:underline"
                >
                  {o.order_number}
                </Link>
              </td>
              <td className="py-2">
                {ORDER_STATUS_LABELS[o.status as OrderStatus]}
              </td>
              <td className="py-2">{o.contact_phone}</td>
              <td className="py-2">₹{o.grand_total}</td>
              <td className="py-2 text-zinc-500">
                {new Date(o.placed_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders?.length && (
        <p className="text-sm text-zinc-500">No orders found.</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} · {count} orders
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded border px-3 py-1">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="rounded border px-3 py-1">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
