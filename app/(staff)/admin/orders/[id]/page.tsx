import { notFound } from "next/navigation";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  PAYMENT_PREFERENCE_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentMode,
  type PaymentPreference,
} from "@/lib/constants";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { formatMeasurementSummary } from "@/lib/measurements";
import { SubmitButton } from "@/components/submit-button";
import { AdminBadge } from "@/components/ui/admin-badge";
import { adminButtonClass } from "@/components/ui/admin-styles";
import { ADMIN_PAYMENT_STATUS_TONE } from "@/lib/admin-status-tone";
import {
  updateOrderStatus,
  assignPickupAgent,
  assignTailor,
  setPromisedDate,
  recordPayment,
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
      `id, order_number, status, grand_total, items_total, delivery_charge,
       handling_charge, surge_charge, advance_required, payment_preference,
       address_line, address_landmark, address_pincode, contact_phone, customer_note,
       city_id, pickup_agent_id, tailor_id, promised_date, placed_at,
       payment_status, commission_amount, tailor_payout,
       order_items ( id, qty, unit_price, line_total, services ( name ),
         measurements ( id, label, garment_type, person_name, values ) ),
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

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, mode, gateway_ref, status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const paid = (payments ?? [])
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, Number(order.grand_total) - paid);

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
                const measurement = Array.isArray(item.measurements)
                  ? item.measurements[0]
                  : item.measurements;
                return (
                  <li key={item.id} className="py-2">
                    <div className="flex justify-between">
                      <span>
                        {service?.name} × {item.qty}
                      </span>
                      <span>₹{item.line_total}</span>
                    </div>
                    {measurement ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {measurement.label}
                        {measurement.person_name
                          ? ` (${measurement.person_name})`
                          : ""}
                        : {formatMeasurementSummary(measurement.values)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-amber-600">
                        No measurements on file — take them at pickup
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm text-zinc-500">
              <div className="flex justify-between">
                <span>Handling charge</span>
                <span>₹{order.handling_charge}</span>
              </div>
              {Number(order.surge_charge) > 0 && (
                <div className="flex justify-between">
                  <span>Late-hours surge</span>
                  <span>₹{order.surge_charge}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery charge (estimated)</span>
                <span>₹{order.delivery_charge}</span>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm font-medium">
              <span>Grand total</span>
              <span>₹{order.grand_total}</span>
            </div>
            {order.tailor_id && (
              <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm text-zinc-500">
                <div className="flex justify-between">
                  <span>Stitchera commission</span>
                  <span>₹{order.commission_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tailor payout</span>
                  <span>₹{order.tailor_payout}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium">Payments</h2>
            <div className="mt-1 flex items-center gap-4 text-sm">
              <AdminBadge tone={ADMIN_PAYMENT_STATUS_TONE[order.payment_status] ?? "neutral"}>
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </AdminBadge>
              <span>
                Paid <span className="font-medium">₹{paid.toFixed(2)}</span>
              </span>
              <span>
                Due <span className="font-medium">₹{balanceDue.toFixed(2)}</span>
              </span>
            </div>
            {paid === 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Advance required: ₹{order.advance_required} · Customer prefers:{" "}
                {order.payment_preference
                  ? PAYMENT_PREFERENCE_LABELS[order.payment_preference as PaymentPreference]
                  : "—"}
              </p>
            )}

            {!!payments?.length && (
              <ul className="mt-3 divide-y text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-2">
                    <span>
                      {PAYMENT_MODE_LABELS[p.mode as PaymentMode] ?? p.mode}
                      {p.gateway_ref ? ` · ${p.gateway_ref}` : ""}
                      {p.status !== "success" ? ` · ${p.status}` : ""}
                    </span>
                    <span className="flex gap-3">
                      <span className="text-zinc-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-medium">₹{p.amount}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {balanceDue > 0 && order.status !== "cancelled" ? (
              <form action={recordPayment} className="mt-4 flex flex-col gap-2">
                <input type="hidden" name="order_id" value={order.id} />
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Amount (₹)
                    <input
                      type="number"
                      name="amount"
                      min="0.01"
                      max={balanceDue}
                      step="0.01"
                      defaultValue={balanceDue.toFixed(2)}
                      required
                      className="w-28 rounded border px-2 py-1.5"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Mode
                    <select
                      name="mode"
                      className="rounded border px-2 py-1.5"
                      defaultValue="cash"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_MODE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Reference (optional)
                    <input
                      type="text"
                      name="gateway_ref"
                      placeholder="UPI txn id"
                      className="rounded border px-2 py-1.5"
                    />
                  </label>
                  <SubmitButton pendingText="Recording..." className={adminButtonClass("primary", "sm")}>
                    Record payment
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                {order.status === "cancelled"
                  ? "Order cancelled."
                  : "Fully paid — nothing outstanding."}
              </p>
            )}
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
            <button type="submit" className={`w-fit ${adminButtonClass("primary", "sm")}`}>
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
            <button type="submit" className={`w-fit ${adminButtonClass("secondary", "sm")}`}>
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
            <button type="submit" className={`w-fit ${adminButtonClass("secondary", "sm")}`}>
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
            <button type="submit" className={`w-fit ${adminButtonClass("secondary", "sm")}`}>
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
