// Normalizes an Indian phone number to E.164 (+91XXXXXXXXXX) so the same
// person typing "9876543210", "+91 98765 43210", and "091-98765-43210"
// always resolves to the same string. Without this, profiles.phone's
// UNIQUE constraint doesn't help — those three inputs would create three
// different Supabase Auth users, and admin's "promote by phone" lookup
// (an exact string match) would silently miss anyone who didn't type their
// number in exactly the stored format.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const trimmed = digits.replace(/^0+/, "");
  if (trimmed.length === 10) return `+91${trimmed}`;
  if (trimmed.startsWith("91") && trimmed.length === 12) return `+${trimmed}`;
  return `+${trimmed}`;
}

export function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
