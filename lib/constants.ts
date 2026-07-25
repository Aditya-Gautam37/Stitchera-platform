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

export const PAYMENT_MODES = [
  "cash",
  "upi",
  "card",
  "netbanking",
  "wallet",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
};

export const PAYMENT_PREFERENCES = ["online", "cod"] as const;
export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number];

export const PAYMENT_PREFERENCE_LABELS: Record<PaymentPreference, string> = {
  online: "Pay online",
  cod: "Cash on delivery",
};

export const SUBSCRIPTION_PLANS = [
  { key: "karigar", name: "Karigar", tagline: "Skilled artisan" },
  { key: "ustad", name: "Ustad", tagline: "Master craftsman" },
  { key: "meher", name: "Meher", tagline: "Grace & elegance" },
  { key: "shahi", name: "Shahi", tagline: "Royal luxury" },
] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]["key"];
