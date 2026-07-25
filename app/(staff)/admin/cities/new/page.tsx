import { requireAdmin } from "@/lib/dal/staff";
import { createCity } from "../actions";

export default async function NewCityPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add city</h1>
      <form action={createCity} className="flex max-w-md flex-col gap-4">
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
          State
          <input
            type="text"
            name="state"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Serviceable pincodes (comma separated)
          <input
            type="text"
            name="pincodes"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Visit charge (₹)
          <input
            type="number"
            name="visit_charge"
            min={0}
            step="0.01"
            defaultValue={0}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Delivery charge (₹)
          <input
            type="number"
            name="delivery_charge"
            min={0}
            step="0.01"
            defaultValue={0}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Minimum order value (₹)
          <input
            type="number"
            name="min_order_value"
            min={0}
            step="0.01"
            defaultValue={0}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" />
          Active (serviceable now)
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
        >
          Create city
        </button>
      </form>
    </div>
  );
}
