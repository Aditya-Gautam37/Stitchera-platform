import { type OrderStatus } from "@/lib/constants";

type Stage = {
  key: string;
  label: string;
  statuses: readonly OrderStatus[];
};

// Six visual stages, not the 9 raw order_status values — a customer reads
// "With the tailor" faster than "with_tailor / ready / qc_passed" as three
// separate rows, and nothing meaningful is lost since the exact status
// still drives the current-stage caption.
const STAGES: readonly Stage[] = [
  { key: "placed", label: "Booked", statuses: ["placed"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "picked_up", label: "Picked up", statuses: ["pickup_assigned", "picked_up"] },
  {
    key: "with_tailor",
    label: "With the tailor",
    statuses: ["with_tailor", "qc_failed", "qc_passed", "ready"],
  },
  { key: "out_for_delivery", label: "Out for delivery", statuses: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
];

type HistoryEntry = { to_status: string; created_at: string };

export function OrderTimeline({
  status,
  history,
  cancelReason,
}: {
  status: OrderStatus;
  history?: HistoryEntry[];
  cancelReason?: string | null;
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-thread-red/30 bg-paper p-5">
        <p className="font-display text-lg font-bold text-thread-red">
          This order was cancelled
        </p>
        {cancelReason && (
          <p className="mt-1 text-sm text-ink-soft">{cancelReason}</p>
        )}
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((stage) =>
    stage.statuses.includes(status)
  );

  const timestampFor = (stage: Stage) => {
    if (!history?.length) return null;
    const match = [...history]
      .reverse()
      .find((h) => stage.statuses.includes(h.to_status as OrderStatus));
    return match ? new Date(match.created_at) : null;
  };

  return (
    <ol className="flex flex-col">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STAGES.length - 1;
        const timestamp = isCompleted || isCurrent ? timestampFor(stage) : null;

        return (
          <li key={stage.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? "border-indigo bg-indigo text-paper"
                    : isCurrent
                      ? "border-marigold bg-marigold text-marigold-ink"
                      : "border-line bg-paper"
                }`}
              >
                {isCompleted ? (
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" />
                  </svg>
                ) : isCurrent ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-marigold-ink" />
                ) : null}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`w-0.5 flex-1 ${isCompleted ? "bg-indigo" : "bg-line"}`}
                  style={{ minHeight: "2.5rem" }}
                />
              )}
            </div>
            <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
              <p
                aria-current={isCurrent ? "step" : undefined}
                className={`font-display text-base font-bold ${
                  isCompleted || isCurrent ? "text-ink" : "text-ink-soft"
                }`}
              >
                {stage.label}
              </p>
              {isCurrent && status === "qc_failed" && (
                <p className="text-sm text-marigold-strong">
                  Sent back to the tailor for a quick fix
                </p>
              )}
              {timestamp && (
                <p className="font-mono text-xs text-ink-soft">
                  {timestamp.toLocaleDateString()} ·{" "}
                  {timestamp.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
