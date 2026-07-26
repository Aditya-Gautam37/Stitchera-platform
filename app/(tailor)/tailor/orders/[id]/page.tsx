import { notFound } from "next/navigation";
import { requireTailor } from "@/lib/dal/tailor";
import { createClient } from "@/lib/supabase/server";
import { formatMeasurementSummary } from "@/lib/measurements";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { SubmitButton } from "@/components/submit-button";
import { markOrderReady } from "./actions";

export default async function TailorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tailor = await requireTailor();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, promised_date, address_pincode, contact_phone,
       order_items ( id, qty, services ( name ),
         measurements ( label, person_name, notes, values ) )`
    )
    .eq("id", id)
    .eq("tailor_id", tailor.id)
    .single();

  if (!order) notFound();

  const status = order.status as OrderStatus;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Order {order.order_number}
        </h1>
        <p className="text-sm text-ink-soft">
          {ORDER_STATUS_LABELS[status]}
          {order.promised_date &&
            ` · Due ${new Date(order.promised_date).toLocaleDateString()}`}
        </p>
        <p className="text-sm text-ink-soft">
          Delivery area pincode: {order.address_pincode}
        </p>
        <p className="text-sm text-ink-soft">
          Customer contact: {order.contact_phone}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink">What to make</h2>
        <ul className="mt-2 flex flex-col gap-4">
          {order.order_items?.map((item) => {
            const service = Array.isArray(item.services)
              ? item.services[0]
              : item.services;
            const measurement = Array.isArray(item.measurements)
              ? item.measurements[0]
              : item.measurements;
            return (
              <li key={item.id} className="rounded border border-line bg-paper p-4">
                <p className="font-medium text-ink">
                  {service?.name} × {item.qty}
                </p>
                {measurement ? (
                  <>
                    <p className="mt-1 text-sm text-ink">
                      {measurement.label}
                      {measurement.person_name ? ` (${measurement.person_name})` : ""}
                    </p>
                    <p className="font-mono text-sm text-ink-soft">
                      {formatMeasurementSummary(measurement.values)}
                    </p>
                    {measurement.notes && (
                      <p className="mt-1 text-sm text-ink-soft">
                        Note: {measurement.notes}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-marigold-strong">
                    No measurements on file yet — check with pickup.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {status === "with_tailor" && (
        <form action={markOrderReady}>
          <input type="hidden" name="order_id" value={order.id} />
          <SubmitButton
            pendingText="Marking ready..."
            className="w-fit rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong disabled:opacity-50"
          >
            Mark ready for delivery
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
