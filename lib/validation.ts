// Shared input parsing for Server Actions that take raw FormData.
// `Number("garbage")` is NaN, and NaN passes straight through Postgres
// numeric columns (Postgres numeric supports NaN as a value) — so without
// this, a malformed or hand-crafted form submission could silently write
// NaN into a price/charge/commission column and corrupt every calculation
// that reads it afterwards. Every admin mutation that takes a number goes
// through one of these instead of a bare `Number(...)`.

export function parseRequiredText(
  value: FormDataEntryValue | null,
  fieldName: string
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${fieldName} is required`);
  return text;
}

export function parseOptionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export function parseMoney(
  value: FormDataEntryValue | null,
  fieldName: string
): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a valid non-negative amount`);
  }
  return Math.round(n * 100) / 100;
}

export function parsePercent(
  value: FormDataEntryValue | null,
  fieldName: string
): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }
  return Math.round(n * 100) / 100;
}

export function parsePositiveInt(
  value: FormDataEntryValue | null,
  fieldName: string,
  { max }: { max?: number } = {}
): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || (max !== undefined && n > max)) {
    throw new Error(
      max !== undefined
        ? `${fieldName} must be a whole number between 1 and ${max}`
        : `${fieldName} must be a positive whole number`
    );
  }
  return n;
}

export function parseNonNegativeInt(
  value: FormDataEntryValue | null,
  fieldName: string
): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number`);
  }
  return n;
}

export function parseSpecialities(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
