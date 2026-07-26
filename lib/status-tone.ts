import type { BadgeTone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/constants";

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  placed: "neutral",
  confirmed: "active",
  pickup_assigned: "active",
  picked_up: "active",
  with_tailor: "active",
  ready: "active",
  qc_failed: "attention",
  qc_passed: "active",
  out_for_delivery: "active",
  delivered: "active",
  cancelled: "danger",
};

export const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "neutral",
  partial: "attention",
  paid: "active",
  refunded: "neutral",
};

export const APPLICATION_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "attention",
  approved: "active",
  rejected: "danger",
};

export const TAILOR_STATUS_TONE: Record<string, BadgeTone> = {
  pending_verification: "attention",
  active: "active",
  suspended: "danger",
  inactive: "neutral",
};
