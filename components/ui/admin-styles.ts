export type AdminButtonVariant = "primary" | "secondary" | "danger";
export type AdminButtonSize = "xs" | "sm" | "md";

const ADMIN_BUTTON_SIZES: Record<AdminButtonSize, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

const ADMIN_BUTTON_VARIANTS: Record<AdminButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-zinc-800",
  secondary: "border hover:bg-zinc-50 dark:hover:bg-zinc-900",
  danger: "border text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
};

export function adminButtonClass(
  variant: AdminButtonVariant = "primary",
  size: AdminButtonSize = "sm"
) {
  return `inline-flex items-center justify-center gap-1.5 rounded transition-colors disabled:opacity-50 ${ADMIN_BUTTON_SIZES[size]} ${ADMIN_BUTTON_VARIANTS[variant]}`;
}

export const adminCardClass = "rounded border";

export const adminTableRowClass = "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900";
