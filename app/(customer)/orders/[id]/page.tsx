import { notFound } from "next/navigation";
import {
  CANCELLABLE_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_MODE_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentMode,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { cancelOrder } from "./actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, grand_total, items_total, visit_charge, delivery_charge,
       address_line, address_landmark, address_pincode, contact_phone, cancel_reason, placed_at,
       payment_status,
       order_items ( id, qty, unit_price, line_total, services ( name ) )`
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: history } = await supabase
    .from("order_status_history")
    .select("from_status, to_status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, mode, status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const paid = (payments ?? [])
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, Number(order.grand_total) - paid);

  const status = order.status as OrderStatus;
  const canCancel = CANCELLABLE_STATUSES.includes(status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Order {order.order_number}</h1>
        <p className="text-sm text-zinc-500">
          Status: {ORDER_STATUS_LABELS[status]}
        </p>
        {order.cancel_reason && (
          <p className="text-sm text-zinc-500">
            Reason: {order.cancel_reason}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Delivery details</h2>
        <p className="text-sm">
          {order.address_line}
          {order.address_landmark ? `, ${order.address_landmark}` : ""} —{" "}
          {order.address_pincode}
        </p>
        <p className="text-sm">Contact: {order.contact_phone}</p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Items</h2>
        <ul className="divide-y">
          {order.order_items?.map((item) => {
            const service = Array.isArray(item.services)
              ? item.services[0]
              : item.services;
            return (
              <li key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {service?.name} × {item.qty}
                </span>
                <span>₹{item.line_total}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="text-sm">
        <div className="flex justify-between">
          <span>Items</span>
          <span>₹{order.items_total}</span>
        </div>
        <div className="flex justify-between">
          <span>Visit charge</span>
          <span>₹{order.visit_charge}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery charge</span>
          <span>₹{order.delivery_charge}</span>
        </div>
        <div className="mt-2 flex justify-between font-medium">
          <span>Grand total</span>
          <span>₹{order.grand_total}</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Payment</h2>
        <div className="mt-1 flex flex-wrap gap-4 text-sm">
          <span className="text-zinc-500">
            {PAYMENT_STATUS_LABELS[order.payment_status] ??
              order.payment_status}
          </span>
          <span>
            Paid <span className="font-medium">₹{paid.toFixed(2)}</span>
          </span>
          {balanceDue > 0 && status !== "cancelled" && (
            <span>
              Due <span className="font-medium">₹{balanceDue.toFixed(2)}</span>
            </span>
          )}
        </div>
        {!!payments?.length && (
          <ul className="mt-2 divide-y text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  {PAYMENT_MODE_LABELS[p.mode as PaymentMode] ?? p.mode}
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
      </div>

      {canCancel && (
        <div>
          <h2 className="text-lg font-medium">Cancel this order</h2>
          <form action={cancelOrder} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <input
              type="text"
              name="cancel_reason"
              placeholder="Reason (optional)"
              className="max-w-sm rounded border px-3 py-2 text-sm"
            />
            <SubmitButton
              pendingText="Cancelling..."
              className="w-fit rounded border border-red-600 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
            >
              Cancel order
            </SubmitButton>
          </form>
        </div>
      )}

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
  );
}
