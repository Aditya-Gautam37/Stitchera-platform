import { buttonClass } from "@/components/ui/styles";

// WCAG audit: text-ink-soft/70 measured 3.38:1 (light) / 4.35:1 (dark)
// against paper — both under the 4.5:1 floor for placeholder text.
// Full-strength ink-soft clears it comfortably (6.85:1+) in both themes.
export const authInputClass =
  "rounded border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-ink-soft";

export const authPrimaryButtonClass = `w-full ${buttonClass("primary", "md")}`;
