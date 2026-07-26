// Shared button/card class builders — same "export a class string, not a
// component" pattern already used by components/auth/styles.ts, extended
// app-wide. This is a design-system consistency fix, not a new UI
// framework: no new dependencies, just factoring out what was already
// being hand-duplicated (the primary button class alone was repeated in
// ~24 places, in three drifting padding variants).

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-indigo text-paper hover:bg-indigo-strong",
  secondary: "border border-line text-ink hover:border-indigo",
  danger: "border border-thread-red text-thread-red hover:bg-thread-red/5",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md"
) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-50 ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`;
}

// The rounded-2xl border border-line bg-paper card shell repeated across
// home/services/book/dashboard/etc. Callers add their own padding/gap —
// content shape varies too much for one class to own that too.
export const cardClass = "rounded-2xl border border-line bg-paper";
