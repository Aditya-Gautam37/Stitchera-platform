// Status (order status, payment status, application status, tailor
// status) was shown as plain text everywhere in the customer-facing app —
// no visual differentiation between "Placed" and "Delivered" beyond the
// word itself. No green "success" tone exists on purpose: the palette
// never had one (see app/globals.css), and inventing one now would be
// adding a hue the brand never had rather than reusing what's there.
// "active" (indigo) covers positive/in-progress state instead.
export type BadgeTone = "neutral" | "active" | "attention" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-cotton text-ink-soft",
  active: "bg-indigo/10 text-indigo",
  attention: "bg-marigold/15 text-marigold-strong",
  danger: "bg-thread-red/10 text-thread-red",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}
