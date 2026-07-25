import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { updateCity, upsertCityPrice } from "../actions";

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: city } = await supabase
    .from("cities")
    .select("*")
    .eq("id", id)
    .single();

  if (!city) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, base_price")
    .order("sort_order");

  const { data: overrides } = await supabase
    .from("city_service_prices")
    .select("service_id, price")
    .eq("city_id", id);

  const overrideMap = new Map((overrides ?? []).map((o) => [o.service_id, o]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{city.name}</h1>

      <form action={updateCity} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="city_id" value={city.id} />
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            defaultValue={city.name}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name (Hindi)
          <input
            type="text"
            name="name_hi"
            defaultValue={city.name_hi ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          State
          <input
            type="text"
            name="state"
            defaultValue={city.state}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Serviceable pincodes (comma separated)
          <input
            type="text"
            name="pincodes"
            defaultValue={(city.pincodes ?? []).join(", ")}
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
            defaultValue={city.visit_charge}
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
            defaultValue={city.delivery_charge}
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
            defaultValue={city.min_order_value}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={city.is_active}
          />
          Active (serviceable now)
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
        >
          Save changes
        </button>
      </form>

      <div>
        <h2 className="text-lg font-medium">Pricing overrides</h2>
        <p className="text-sm text-zinc-500">
          Leave blank to fall back to the service&apos;s base price.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-zinc-500">
              <th className="py-2 font-medium">Service</th>
              <th className="py-2 font-medium">Base price</th>
              <th className="py-2 font-medium">Override price</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {services?.map((s) => {
              const override = overrideMap.get(s.id);
              return (
                <tr key={s.id}>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2">₹{s.base_price}</td>
                  <td className="py-2">
                    <form
                      action={upsertCityPrice}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="city_id" value={city.id} />
                      <input type="hidden" name="service_id" value={s.id} />
                      <input
                        type="number"
                        name="price"
                        min={0}
                        step="0.01"
                        defaultValue={override?.price ?? ""}
                        placeholder={String(s.base_price)}
                        className="w-28 rounded border px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
