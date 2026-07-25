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
import { StarRatingInput } from "@/components/site/star-rating-input";
import { cancelOrder } from "./actions";
import { submitReview } from "./review-actions";

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
       payment_status, tailor_id, pickup_agent_id,
       order_items ( id, qty, unit_price, line_total, services ( name ),
         measurements ( label, person_name, values ) ),
       tailor:tailors ( name ),
       pickup_agent:profiles!pickup_agent_id ( full_name )`
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("reviewee_type")
    .eq("order_id", id);

  const paid = (payments ?? [])
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, Number(order.grand_total) - paid);

  const status = order.status as OrderStatus;
  const canCancel = CANCELLABLE_STATUSES.includes(status);

  const tailor = Array.isArray(order.tailor) ? order.tailor[0] : order.tailor;
  const pickupAgent = Array.isArray(order.pickup_agent)
    ? order.pickup_agent[0]
    : order.pickup_agent;

  const reviewedTypes = new Set((reviews ?? []).map((r) => r.reviewee_type));
  const canReviewTailor = order.tailor_id && !reviewedTypes.has("tailor");
  const canReviewDelivery =
    order.pickup_agent_id && !reviewedTypes.has("delivery_partner");
  const showReviewForm =
    status === "delivered" && (canReviewTailor || canReviewDelivery);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Order {order.order_number}
        </h1>
        <p className="text-sm text-ink-soft">
          Status: {ORDER_STATUS_LABELS[status]}
        </p>
        {order.cancel_reason && (
          <p className="text-sm text-ink-soft">Reason: {order.cancel_reason}</p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink">Delivery details</h2>
        <p className="text-sm text-ink">
          {order.address_line}
          {order.address_landmark ? `, ${order.address_landmark}` : ""} —{" "}
          {order.address_pincode}
        </p>
        <p className="text-sm text-ink">Contact: {order.contact_phone}</p>
        {tailor && <p className="text-sm text-ink-soft">Tailor: {tailor.name}</p>}
        {pickupAgent && (
          <p className="text-sm text-ink-soft">
            Pickup/delivery: {pickupAgent.full_name}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink">Items</h2>
        <ul className="divide-y divide-line-soft">
          {order.order_items?.map((item) => {
            const service = Array.isArray(item.services)
              ? item.services[0]
              : item.services;
            const measurement = Array.isArray(item.measurements)
              ? item.measurements[0]
              : item.measurements;
            return (
              <li key={item.id} className="py-2 text-sm">
                <div className="flex justify-between text-ink">
                  <span>
                    {service?.name} × {item.qty}
                  </span>
                  <span className="font-mono">₹{item.line_total}</span>
                </div>
                {measurement && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Using: {measurement.label}
                    {measurement.person_name ? ` (${measurement.person_name})` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="text-sm text-ink">
        <div className="flex justify-between">
          <span>Items</span>
          <span className="font-mono">₹{order.items_total}</span>
        </div>
        <div className="flex justify-between">
          <span>Visit charge</span>
          <span className="font-mono">₹{order.visit_charge}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery charge</span>
          <span className="font-mono">₹{order.delivery_charge}</span>
        </div>
        <div className="mt-2 flex justify-between font-medium">
          <span>Grand total</span>
          <span className="font-mono">₹{order.grand_total}</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink">Payment</h2>
        <div className="mt-1 flex flex-wrap gap-4 text-sm">
          <span className="text-ink-soft">
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </span>
          <span className="text-ink">
            Paid <span className="font-mono font-medium">₹{paid.toFixed(2)}</span>
          </span>
          {balanceDue > 0 && status !== "cancelled" && (
            <span className="text-ink">
              Due <span className="font-mono font-medium">₹{balanceDue.toFixed(2)}</span>
            </span>
          )}
        </div>
        {!!payments?.length && (
          <ul className="mt-2 divide-y divide-line-soft text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-ink">
                <span>
                  {PAYMENT_MODE_LABELS[p.mode as PaymentMode] ?? p.mode}
                  {p.status !== "success" ? ` · ${p.status}` : ""}
                </span>
                <span className="flex gap-3">
                  <span className="text-ink-soft">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono font-medium">₹{p.amount}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCancel && (
        <div>
          <h2 className="text-lg font-medium text-ink">Cancel this order</h2>
          <form action={cancelOrder} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <input
              type="text"
              name="cancel_reason"
              placeholder="Reason (optional)"
              className="max-w-sm rounded border border-line bg-paper px-3 py-2 text-sm"
            />
            <SubmitButton
              pendingText="Cancelling..."
              className="w-fit rounded border border-thread-red px-3 py-1.5 text-sm text-thread-red disabled:opacity-50"
            >
              Cancel order
            </SubmitButton>
          </form>
        </div>
      )}

      {showReviewForm && (
        <div className="rounded border border-line bg-paper p-4">
          <h2 className="font-display text-lg font-bold text-ink">
            How was it?
          </h2>
          <p className="text-sm text-ink-soft">
            Your review helps other customers pick a tailor with confidence.
          </p>
          <form action={submitReview} className="mt-4 flex flex-col gap-5">
            <input type="hidden" name="order_id" value={order.id} />
            {canReviewTailor && (
              <div className="flex flex-col gap-2">
                <input type="hidden" name="tailor_id" value={order.tailor_id!} />
                <StarRatingInput
                  name="tailor_rating"
                  label={`Rate ${tailor?.name ?? "your tailor"}`}
                />
                <textarea
                  name="tailor_comment"
                  placeholder="Anything about the stitching quality or fit? (optional)"
                  className="rounded border border-line bg-cotton px-3 py-2 text-sm"
                />
              </div>
            )}
            {canReviewDelivery && (
              <div className="flex flex-col gap-2">
                <input
                  type="hidden"
                  name="delivery_agent_id"
                  value={order.pickup_agent_id!}
                />
                <StarRatingInput
                  name="delivery_rating"
                  label={`Rate ${pickupAgent?.full_name ?? "your delivery partner"}`}
                />
                <textarea
                  name="delivery_comment"
                  placeholder="Anything about pickup/delivery? (optional)"
                  className="rounded border border-line bg-cotton px-3 py-2 text-sm"
                />
              </div>
            )}
            <SubmitButton
              pendingText="Submitting..."
              className="w-fit rounded-full bg-indigo px-5 py-2 text-sm font-medium text-paper hover:bg-indigo-strong disabled:opacity-50"
            >
              Submit review
            </SubmitButton>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium text-ink">Timeline</h2>
        <ul className="text-sm text-ink-soft">
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
