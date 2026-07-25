export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "pickup_assigned",
  "picked_up",
  "with_tailor",
  "ready",
  "qc_failed",
  "qc_passed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  pickup_assigned: "Pickup assigned",
  picked_up: "Picked up",
  with_tailor: "With tailor",
  ready: "Ready",
  qc_failed: "QC failed",
  qc_passed: "QC passed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Statuses a customer can still cancel from — must match the DB trigger
// restrict_customer_order_update() in 0003_production_hardening.sql.
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["placed", "confirmed"];
