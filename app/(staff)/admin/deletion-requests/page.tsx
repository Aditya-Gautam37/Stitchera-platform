import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { AdminBadge } from "@/components/ui/admin-badge";
import { adminButtonClass, adminCardClass, adminTableRowClass } from "@/components/ui/admin-styles";
import { ADMIN_DELETION_STATUS_TONE } from "@/lib/admin-status-tone";
import { dismissDeletionRequest, markDeletionActioned } from "./actions";

type RequestRow = {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  profile: { full_name: string | null; phone: string | null } | null;
};

export default async function DeletionRequestsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("deletion_requests")
    .select("id, reason, status, created_at, profile:profiles(full_name, phone)")
    .order("created_at", { ascending: false });

  const rows = (requests ?? []) as unknown as RequestRow[];
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Account deletion requests</h1>

      <div>
        <h2 className="text-lg font-medium">Pending</h2>
        {!pending.length ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing waiting on you.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {pending.map((r) => (
              <li key={r.id} className={`p-4 ${adminCardClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {r.profile?.full_name || r.profile?.phone || "Customer"}
                    </p>
                    <p className="text-sm text-zinc-500">{r.profile?.phone}</p>
                    <p className="text-sm text-zinc-500">
                      Requested {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.reason && (
                      <p className="mt-1 text-sm text-zinc-600">
                        &ldquo;{r.reason}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={markDeletionActioned}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <SubmitButton
                        pendingText="Saving..."
                        className={`w-full ${adminButtonClass("primary", "sm")}`}
                      >
                        Mark actioned
                      </SubmitButton>
                    </form>
                    <form action={dismissDeletionRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <SubmitButton
                        pendingText="Saving..."
                        className={`w-full ${adminButtonClass("secondary", "sm")}`}
                      >
                        Dismiss
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
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {decided.map((r) => (
                <tr key={r.id} className={adminTableRowClass}>
                  <td className="py-2">
                    {r.profile?.full_name || r.profile?.phone || "Customer"}
                  </td>
                  <td className="py-2">
                    <AdminBadge tone={ADMIN_DELETION_STATUS_TONE[r.status] ?? "neutral"} className="capitalize">
                      {r.status}
                    </AdminBadge>
                  </td>
                  <td className="py-2 text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
