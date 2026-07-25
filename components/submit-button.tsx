"use client";

import { useFormStatus } from "react-dom";

// Disables the button for the lifetime of its parent <form>'s pending
// Server Action call. A plain <button type="submit"> stays clickable
// while the request is in flight, so a double-click (or an impatient
// second tap) fires two separate submissions — for a booking or a
// cancellation, that's a duplicate order or a confusing double-cancel
// race, not just a cosmetic glitch. useFormStatus reads the nearest
// ancestor form's state, so this only works rendered inside that form.
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
