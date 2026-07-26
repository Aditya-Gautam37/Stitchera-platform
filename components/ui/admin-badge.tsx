export type AdminBadgeTone = "neutral" | "positive" | "attention" | "danger";

const ADMIN_BADGE_TONES: Record<AdminBadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900",
  positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  attention: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function AdminBadge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: AdminBadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${ADMIN_BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
