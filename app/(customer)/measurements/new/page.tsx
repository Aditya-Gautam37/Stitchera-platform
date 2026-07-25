import Link from "next/link";
import { MeasurementFields } from "@/components/measurement-fields";
import { SubmitButton } from "@/components/submit-button";
import { createMeasurement } from "../actions";

export default function NewMeasurementPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add measurements</h1>
      <form action={createMeasurement} className="flex flex-col gap-5">
        <MeasurementFields />
        <div className="flex items-center gap-4">
          <SubmitButton
            pendingText="Saving..."
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save measurements
          </SubmitButton>
          <Link href="/measurements" className="text-sm text-zinc-500 underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
