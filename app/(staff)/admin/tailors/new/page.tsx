import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { createTailor } from "../actions";

export default async function NewTailorPage() {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin/tailors");

  const supabase = await createClient();
  const cities =
    profile.role === "admin"
      ? (await supabase.from("cities").select("id, name").order("name")).data
      : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add tailor</h1>
      <form action={createTailor} className="flex max-w-md flex-col gap-4">
        {profile.role === "admin" && (
          <label className="flex flex-col gap-1 text-sm">
            City
            <select
              name="city_id"
              required
              className="rounded border px-3 py-2"
            >
              {cities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
          Phone
          <input
            type="tel"
            name="phone"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Shop name
          <input
            type="text"
            name="shop_name"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            type="text"
            name="address"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Specialities (comma separated)
          <input
            type="text"
            name="specialities"
            placeholder="kurta, blouse, alteration"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Daily capacity
          <input
            type="number"
            name="daily_capacity"
            min={1}
            defaultValue={5}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Commission %
          <input
            type="number"
            name="commission_pct"
            min={0}
            max={100}
            step="0.01"
            defaultValue={25}
            className="rounded border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
        >
          Create tailor
        </button>
      </form>
    </div>
  );
}
