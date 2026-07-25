// Measurement fields are stored in measurements.values as a jsonb object,
// e.g. {"chest":40,"waist":34,"unit":"inch"}. Keeping the field list here
// (rather than as database columns) is deliberate: different garments need
// different subsets, and a tailor may want a field we didn't anticipate —
// but the app still needs ONE canonical list to render and validate against,
// or every screen invents its own spelling of "shoulder".

export const MEASUREMENT_FIELDS = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "shoulder", label: "Shoulder" },
  { key: "length", label: "Length" },
  { key: "sleeve", label: "Sleeve" },
  { key: "neck", label: "Neck" },
  { key: "armhole", label: "Armhole" },
  { key: "thigh", label: "Thigh" },
  { key: "knee", label: "Knee" },
  { key: "bottom", label: "Bottom" },
  { key: "inseam", label: "Inseam" },
] as const;

export type MeasurementFieldKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

export const MEASUREMENT_UNITS = ["inch", "cm"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const GARMENT_TYPES = [
  "kurta",
  "blouse",
  "suit",
  "shirt",
  "trouser",
  "saree",
  "lehenga",
  "uniform",
  "other",
] as const;

export type MeasurementValues = Partial<
  Record<MeasurementFieldKey, number>
> & {
  unit?: MeasurementUnit;
};

// Sane physical bounds. Without these, a typo like "400" instead of "40"
// silently becomes a tailoring instruction — and in inches that's a garment
// ten times too big, discovered only after the cloth is cut.
const MIN_VALUE = 1;
const MAX_VALUE_INCH = 100;
const MAX_VALUE_CM = 254;

export function parseMeasurementValues(formData: FormData): MeasurementValues {
  const rawUnit = formData.get("unit");
  const unit: MeasurementUnit =
    rawUnit === "cm" ? "cm" : "inch";
  const max = unit === "cm" ? MAX_VALUE_CM : MAX_VALUE_INCH;

  const values: MeasurementValues = { unit };
  let provided = 0;

  for (const field of MEASUREMENT_FIELDS) {
    const raw = formData.get(field.key);
    if (typeof raw !== "string" || raw.trim() === "") continue;

    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error(`${field.label} must be a number`);
    }
    if (n < MIN_VALUE || n > max) {
      throw new Error(
        `${field.label} must be between ${MIN_VALUE} and ${max} ${unit}`
      );
    }
    values[field.key] = Math.round(n * 100) / 100;
    provided += 1;
  }

  if (provided === 0) {
    throw new Error("Please enter at least one measurement");
  }

  return values;
}

export function formatMeasurementSummary(values: unknown): string {
  if (!values || typeof values !== "object") return "—";
  const v = values as MeasurementValues;
  const unit = v.unit ?? "inch";
  const parts = MEASUREMENT_FIELDS.filter(
    (f) => typeof v[f.key] === "number"
  ).map((f) => `${f.label} ${v[f.key]}`);
  return parts.length ? `${parts.join(" · ")} (${unit})` : "—";
}
