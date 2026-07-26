import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMeasurementSummary } from "@/lib/measurements";
import { SubmitButton } from "@/components/submit-button";
import { archiveMeasurement } from "./actions";

export default async function MeasurementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: measurements } = await supabase
    .from("measurements")
    .select("id, label, garment_type, person_name, values, notes, taken_by")
    .eq("profile_id", user!.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Measurements</h1>
          <p className="text-sm text-ink-soft">
            Save them once and reuse them on every order.
          </p>
        </div>
        <Link
          href="/measurements/new"
          className="rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Add measurements
        </Link>
      </div>

      {!measurements?.length ? (
        <p className="text-sm text-ink-soft">
          Nothing saved yet. Add a set and your next booking gets faster.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {measurements.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-ink">
                  {m.label}
                  <span className="ml-2 text-sm font-normal text-ink-soft">
                    {m.garment_type}
                    {m.person_name ? ` · ${m.person_name}` : ""}
                  </span>
                </p>
                <p className="mt-0.5 font-mono text-sm text-ink-soft">
                  {formatMeasurementSummary(m.values)}
                </p>
                {m.notes && (
                  <p className="text-sm text-ink-soft">{m.notes}</p>
                )}
                {m.taken_by && (
                  <p className="text-xs text-ink-soft">
                    Recorded by our pickup team
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <Link
                  href={`/measurements/${m.id}`}
                  className="text-indigo underline"
                >
                  Edit
                </Link>
                <form action={archiveMeasurement}>
                  <input type="hidden" name="measurement_id" value={m.id} />
                  <SubmitButton
                    pendingText="Removing..."
                    className="text-ink-soft underline disabled:opacity-50"
                  >
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
