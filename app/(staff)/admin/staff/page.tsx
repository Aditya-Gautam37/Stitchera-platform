import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { updateStaffRole, promoteByPhone } from "./actions";

export default async function StaffPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, city_id, is_active")
    .neq("role", "customer")
    .order("role");

  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .order("name");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Staff</h1>

      <div>
        <h2 className="text-lg font-medium">Promote a customer</h2>
        <form
          action={promoteByPhone}
          className="mt-2 flex max-w-2xl flex-wrap items-end gap-2"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Phone number
            <input
              type="tel"
              name="phone"
              required
              placeholder="+91XXXXXXXXXX"
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Role
            <select name="role" className="rounded border px-3 py-2">
              <option value="city_manager">City manager</option>
              <option value="pickup_agent">Pickup agent</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            City
            <select name="city_id" className="rounded border px-3 py-2">
              <option value="">No city</option>
              {cities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Promote
          </button>
        </form>
        <p className="mt-1 text-xs text-zinc-500">
          The person must already have an account (signed up once via phone
          OTP).
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Current staff</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-zinc-500">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Phone</th>
              <th className="py-2 font-medium">Role, city &amp; status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff?.map((s) => (
              <tr key={s.id}>
                <td className="py-2 align-top">{s.full_name || "—"}</td>
                <td className="py-2 align-top">{s.phone}</td>
                <td className="py-2">
                  <form
                    action={updateStaffRole}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="profile_id" value={s.id} />
                    <select
                      name="role"
                      defaultValue={s.role}
                      className="rounded border px-2 py-1"
                    >
                      <option value="customer">Customer</option>
                      <option value="pickup_agent">Pickup agent</option>
                      <option value="city_manager">City manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      name="city_id"
                      defaultValue={s.city_id ?? ""}
                      className="rounded border px-2 py-1"
                    >
                      <option value="">No city</option>
                      {cities?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={s.is_active}
                      />
                      Active
                    </label>
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!staff?.length && (
          <p className="mt-2 text-sm text-zinc-500">No staff accounts yet.</p>
        )}
      </div>
    </div>
  );
}
