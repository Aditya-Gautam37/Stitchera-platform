import type { AdminBadgeTone } from "@/components/ui/admin-badge";
import type { OrderStatus } from "@/lib/constants";

export const ADMIN_ORDER_STATUS_TONE: Record<OrderStatus, AdminBadgeTone> = {
  placed: "neutral",
  confirmed: "positive",
  pickup_assigned: "positive",
  picked_up: "positive",
  with_tailor: "positive",
  ready: "positive",
  qc_failed: "attention",
  qc_passed: "positive",
  out_for_delivery: "positive",
  delivered: "positive",
  cancelled: "danger",
};

export const ADMIN_PAYMENT_STATUS_TONE: Record<string, AdminBadgeTone> = {
  pending: "neutral",
  partial: "attention",
  paid: "positive",
  refunded: "neutral",
};

export const ADMIN_APPLICATION_STATUS_TONE: Record<string, AdminBadgeTone> = {
  pending: "attention",
  approved: "positive",
  rejected: "danger",
};

export const ADMIN_TAILOR_STATUS_TONE: Record<string, AdminBadgeTone> = {
  pending_verification: "attention",
  active: "positive",
  suspended: "danger",
  inactive: "neutral",
};

export const ADMIN_DELETION_STATUS_TONE: Record<string, AdminBadgeTone> = {
  pending: "attention",
  actioned: "positive",
  dismissed: "neutral",
};
