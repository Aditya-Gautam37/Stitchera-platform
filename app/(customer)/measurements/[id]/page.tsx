import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type MeasurementValues } from "@/lib/measurements";
import { MeasurementFields } from "@/components/measurement-fields";
import { SubmitButton } from "@/components/submit-button";
import { updateMeasurement } from "../actions";

export default async function EditMeasurementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: measurement } = await supabase
    .from("measurements")
    .select("id, label, garment_type, person_name, notes, values")
    .eq("id", id)
    .eq("profile_id", user!.id)
    .single();

  if (!measurement) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit measurements</h1>
      <form action={updateMeasurement} className="flex flex-col gap-5">
        <input type="hidden" name="measurement_id" value={measurement.id} />
        <MeasurementFields
          defaults={{
            label: measurement.label,
            garment_type: measurement.garment_type,
            person_name: measurement.person_name,
            notes: measurement.notes,
            values: measurement.values as MeasurementValues,
          }}
        />
        <div className="flex items-center gap-4">
          <SubmitButton
            pendingText="Saving..."
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save changes
          </SubmitButton>
          <Link href="/measurements" className="text-sm text-zinc-500 underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
