import {
  GARMENT_TYPES,
  MEASUREMENT_FIELDS,
  MEASUREMENT_UNITS,
  type MeasurementValues,
} from "@/lib/measurements";

// The shared body of a measurement form — the inputs only, so the surrounding
// <form>, its action, and its hidden fields stay the caller's business
// (customer editing their own vs. staff recording one for a customer).
export function MeasurementFields({
  defaults,
}: {
  defaults?: {
    label?: string | null;
    garment_type?: string | null;
    person_name?: string | null;
    notes?: string | null;
    values?: MeasurementValues | null;
  };
}) {
  const values = defaults?.values ?? {};

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Label
          <input
            type="text"
            name="label"
            placeholder="e.g. Papa kurta"
            defaultValue={defaults?.label ?? ""}
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          Garment
          <select
            name="garment_type"
            defaultValue={defaults?.garment_type ?? "kurta"}
            className="rounded border border-line bg-paper px-3 py-2"
          >
            {GARMENT_TYPES.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          Person (optional)
          <input
            type="text"
            name="person_name"
            placeholder="Whose measurements?"
            defaultValue={defaults?.person_name ?? ""}
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          Unit
          <select
            name="unit"
            defaultValue={values.unit ?? "inch"}
            className="rounded border border-line bg-paper px-3 py-2"
          >
            {MEASUREMENT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Measurements</p>
        <p className="text-xs text-ink-soft">
          Fill only what applies to this garment — blanks are ignored.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MEASUREMENT_FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-sm text-ink">
              {field.label}
              <input
                type="number"
                name={field.key}
                min="1"
                step="0.25"
                defaultValue={values[field.key] ?? ""}
                className="rounded border border-line bg-paper px-2 py-1.5"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Notes (optional)
        <textarea
          name="notes"
          defaultValue={defaults?.notes ?? ""}
          placeholder="Loose fit, full sleeve, etc."
          className="rounded border border-line bg-paper px-3 py-2"
        />
      </label>
    </>
  );
}
