import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { approveApplication, rejectApplication } from "./actions";

export default async function ApplicationsPage() {
  const profile = await requireStaff();

  // RLS ("staff manages applications") already scopes this to the caller's
  // city for city_manager/pickup_agent, and to every city for admin — no
  // explicit city filter needed here.
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("partner_applications")
    .select(
      "id, applicant_type, status, full_name, phone, shop_name, vehicle_type, specialities, registration_fee, rejection_reason, created_at"
    )
    .order("created_at", { ascending: false });

  const pending = (applications ?? []).filter((a) => a.status === "pending");
  const decided = (applications ?? []).filter((a) => a.status !== "pending");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Partner applications</h1>

      <div>
        <h2 className="text-lg font-medium">Pending review</h2>
        {!pending.length ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing waiting on you.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {pending.map((a) => (
              <li key={a.id} className="rounded border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {a.full_name}
                      <span className="ml-2 rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-500">
                        {a.applicant_type === "tailor" ? "Tailor" : "Delivery partner"}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">{a.phone}</p>
                    {a.applicant_type === "tailor" ? (
                      <p className="text-sm text-zinc-500">
                        {a.shop_name || "No shop name"}
                        {a.specialities?.length ? ` · ${a.specialities.join(", ")}` : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-500">Vehicle: {a.vehicle_type}</p>
                    )}
                    <p className="text-sm text-zinc-500">
                      Registration fee: ₹{a.registration_fee}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={approveApplication}>
                      <input type="hidden" name="application_id" value={a.id} />
                      <SubmitButton
                        pendingText="Approving..."
                        className="w-full rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Approve
                      </SubmitButton>
                    </form>
                    <form action={rejectApplication} className="flex flex-col gap-1">
                      <input type="hidden" name="application_id" value={a.id} />
                      <input
                        type="text"
                        name="rejection_reason"
                        placeholder="Reason (optional)"
                        className="rounded border px-2 py-1 text-xs"
                      />
                      <SubmitButton
                        pendingText="Rejecting..."
                        className="w-full rounded border px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
                      >
                        Reject
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Decided</h2>
        {!decided.length ? (
          <p className="mt-2 text-sm text-zinc-500">No decisions yet.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {decided.map((a) => (
                <tr key={a.id}>
                  <td className="py-2">{a.full_name}</td>
                  <td className="py-2">
                    {a.applicant_type === "tailor" ? "Tailor" : "Delivery partner"}
                  </td>
                  <td className="py-2 capitalize">{a.status}</td>
                  <td className="py-2 text-zinc-500">{a.rejection_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Viewing as {profile.role.replace("_", " ")}
        {profile.role !== "admin" ? " — scoped to your city." : " — all cities."}
      </p>
    </div>
  );
}
