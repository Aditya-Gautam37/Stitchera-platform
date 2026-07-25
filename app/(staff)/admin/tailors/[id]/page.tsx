import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { linkTailorProfile, updateTailor } from "../actions";

export default async function TailorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const supabase = await createClient();
  const { data: tailor } = await supabase
    .from("tailors")
    .select("*")
    .eq("id", id)
    .single();

  if (!tailor) notFound();
  if (
    profile.role !== "admin" &&
    profile.city_id &&
    tailor.city_id !== profile.city_id
  ) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{tailor.name}</h1>
        <p className="text-sm text-zinc-500">
          {tailor.total_orders} orders · rating {tailor.rating ?? "—"}
        </p>
      </div>

      <div className="max-w-md rounded border p-4">
        <h2 className="text-sm font-medium">App login</h2>
        {tailor.profile_id ? (
          <p className="mt-1 text-sm text-zinc-500">
            Linked to an account — this tailor can sign in at /tailor.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-500">
              No account linked yet — this tailor cannot sign in. Link them to
              an existing account by phone number (they must have already
              signed up in the app).
            </p>
            <form
              action={linkTailorProfile}
              className="mt-3 flex items-end gap-2"
            >
              <input type="hidden" name="tailor_id" value={tailor.id} />
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Account phone number
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91..."
                  className="rounded border px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm text-white"
              >
                Link
              </button>
            </form>
          </>
        )}
      </div>

      <form action={updateTailor} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="tailor_id" value={tailor.id} />
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            defaultValue={tailor.name}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            type="tel"
            name="phone"
            defaultValue={tailor.phone}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Shop name
          <input
            type="text"
            name="shop_name"
            defaultValue={tailor.shop_name ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            type="text"
            name="address"
            defaultValue={tailor.address ?? ""}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Specialities (comma separated)
          <input
            type="text"
            name="specialities"
            defaultValue={(tailor.specialities ?? []).join(", ")}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Daily capacity
          <input
            type="number"
            name="daily_capacity"
            min={1}
            defaultValue={tailor.daily_capacity}
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
            defaultValue={tailor.commission_pct}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={tailor.status}
            className="rounded border px-3 py-2"
          >
            <option value="pending_verification">Pending verification</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
