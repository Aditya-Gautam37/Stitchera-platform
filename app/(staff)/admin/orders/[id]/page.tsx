import { notFound } from "next/navigation";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import {
  updateOrderStatus,
  assignPickupAgent,
  assignTailor,
  setPromisedDate,
} from "./actions";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaff();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, grand_total, items_total, visit_charge, delivery_charge,
       address_line, address_landmark, address_pincode, contact_phone, customer_note,
       city_id, pickup_agent_id, tailor_id, promised_date, placed_at,
       order_items ( id, qty, unit_price, line_total, services ( name ) ),
       customer:profiles!customer_id ( full_name, phone )`
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const customer = Array.isArray(order.customer)
    ? order.customer[0]
    : order.customer;

  const { data: history } = await supabase
    .from("order_status_history")
    .select("from_status, to_status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const { data: pickupAgents } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "pickup_agent")
    .eq("city_id", order.city_id);

  const { data: tailors } = await supabase
    .from("tailors")
    .select("id, name, phone")
    .eq("city_id", order.city_id)
    .eq("status", "active");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Order {order.order_number}</h1>
        <p className="text-sm text-zinc-500">
          {customer?.full_name} · {customer?.phone}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-medium">Delivery details</h2>
            <p className="text-sm">
              {order.address_line}
              {order.address_landmark ? `, ${order.address_landmark}` : ""} —{" "}
              {order.address_pincode}
            </p>
            <p className="text-sm">Contact: {order.contact_phone}</p>
            {order.customer_note && (
              <p className="text-sm text-zinc-500">
                Note: {order.customer_note}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium">Items</h2>
            <ul className="divide-y text-sm">
              {order.order_items?.map((item) => {
                const service = Array.isArray(item.services)
                  ? item.services[0]
                  : item.services;
                return (
                  <li key={item.id} className="flex justify-between py-2">
                    <span>
                      {service?.name} × {item.qty}
                    </span>
                    <span>₹{item.line_total}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-between text-sm font-medium">
              <span>Grand total</span>
              <span>₹{order.grand_total}</span>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium">Timeline</h2>
            <ul className="text-sm text-zinc-600">
              {history?.map((event, i) => (
                <li key={i}>
                  {event.from_status
                    ? ORDER_STATUS_LABELS[event.from_status as OrderStatus]
                    : "created"}{" "}
                  → {ORDER_STATUS_LABELS[event.to_status as OrderStatus]} (
                  {new Date(event.created_at).toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <form action={updateOrderStatus} className="flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-sm font-medium">Status</label>
            <select
              name="status"
              defaultValue={order.status}
              className="rounded border px-2 py-1.5 text-sm"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white"
            >
              Update status
            </button>
          </form>

          <form action={assignPickupAgent} className="flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-sm font-medium">Pickup agent</label>
            <select
              name="pickup_agent_id"
              defaultValue={order.pickup_agent_id ?? ""}
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {pickupAgents?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.phone}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-fit rounded border px-3 py-1.5 text-sm"
            >
              Assign
            </button>
          </form>

          <form action={assignTailor} className="flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-sm font-medium">Tailor</label>
            <select
              name="tailor_id"
              defaultValue={order.tailor_id ?? ""}
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {tailors?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-fit rounded border px-3 py-1.5 text-sm"
            >
              Assign
            </button>
          </form>

          <form action={setPromisedDate} className="flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-sm font-medium">Promised date</label>
            <input
              type="date"
              name="promised_date"
              defaultValue={order.promised_date ?? ""}
              className="rounded border px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="w-fit rounded border px-3 py-1.5 text-sm"
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
