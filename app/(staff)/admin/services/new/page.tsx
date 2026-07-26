import { requireAdmin } from "@/lib/dal/staff";
import { adminButtonClass } from "@/components/ui/admin-styles";
import { createService } from "../actions";

export default async function NewServicePage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add service</h1>
      <form action={createService} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name (Hindi, optional)
          <input
            type="text"
            name="name_hi"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Slug (optional, auto-generated from name)
          <input
            type="text"
            name="slug"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <input
            type="text"
            name="category"
            placeholder="stitching / alteration / repair"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Garment type
          <input
            type="text"
            name="garment_type"
            placeholder="kurta, blouse, ..."
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Base price (₹)
          <input
            type="number"
            name="base_price"
            min={0}
            step="0.01"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estimated days
          <input
            type="number"
            name="est_days"
            min={1}
            defaultValue={3}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sort order
          <input
            type="number"
            name="sort_order"
            defaultValue={0}
            className="rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className={`w-fit ${adminButtonClass("primary", "md")}`}>
          Create service
        </button>
      </form>
    </div>
  );
}
