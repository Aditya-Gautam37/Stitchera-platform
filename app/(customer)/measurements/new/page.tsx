import Link from "next/link";
import { MeasurementFields } from "@/components/measurement-fields";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui/styles";
import { createMeasurement } from "../actions";

export default function NewMeasurementPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink">Add measurements</h1>
      <form action={createMeasurement} className="flex flex-col gap-5">
        <MeasurementFields />
        <div className="flex items-center gap-4">
          <SubmitButton pendingText="Saving..." className={buttonClass("primary", "md")}>
            Save measurements
          </SubmitButton>
          <Link href="/measurements" className="text-sm text-ink-soft underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
