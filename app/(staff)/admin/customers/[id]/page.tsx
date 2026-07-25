import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, is_active, created_at")
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (!customer) notFound();

  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, status, grand_total, city_id, placed_at")
    .eq("customer_id", id)
    .order("placed_at", { ascending: false });

  if (profile.role !== "admin" && profile.city_id) {
    ordersQuery = ordersQuery.eq("city_id", profile.city_id);
  }

  const { data: orders } = await ordersQuery;

  // Non-admin staff only get here via the customer list, which is already
  // scoped to their city — an empty result means this customer isn't theirs.
  if (profile.role !== "admin" && (!orders || orders.length === 0)) {
    notFound();
  }

  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, line1, line2, landmark, pincode, is_default")
    .eq("profile_id", id);

  const { data: measurements } = await supabase
    .from("measurements")
    .select("id, label, garment_type, is_active")
    .eq("profile_id", id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {customer.full_name || "Unnamed customer"}
        </h1>
        <p className="text-sm text-zinc-500">
          {customer.phone} · {customer.email || "no email"}
        </p>
        <p className="text-sm text-zinc-500">
          {customer.is_active ? "Active" : "Inactive"} · joined{" "}
          {new Date(customer.created_at).toLocaleDateString()}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Orders</h2>
        {!orders?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No orders yet.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {orders.map((o) => (
              <li key={o.id} className="py-2">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex justify-between hover:underline"
                >
                  <span>
                    {o.order_number} · {o.status.replace(/_/g, " ")}
                  </span>
                  <span>₹{o.grand_total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Addresses</h2>
        {!addresses?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No saved addresses.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {addresses.map((a) => (
              <li key={a.id} className="py-2">
                {a.label && <span className="font-medium">{a.label}: </span>}
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                {a.landmark ? `, ${a.landmark}` : ""} — {a.pincode}
                {a.is_default && (
                  <span className="ml-2 text-xs text-zinc-500">(default)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Measurements</h2>
        {!measurements?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No saved measurements.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {measurements.map((m) => (
              <li key={m.id} className="py-2">
                {m.label} · {m.garment_type} {!m.is_active && "(inactive)"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
