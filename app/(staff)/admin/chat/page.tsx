import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { AdminBadge } from "@/components/ui/admin-badge";

export default async function AdminChatPage() {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id, status, last_message_at, customer_id")
    .order("status", { ascending: true })
    .order("last_message_at", { ascending: false })
    .limit(100);

  const customerIds = [...new Set((threads ?? []).map((t) => t.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", customerIds)
    : { data: [] };
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Live chat</h1>

      {!threads?.length ? (
        <p className="text-sm text-zinc-500">No chat threads yet.</p>
      ) : (
        <ul className="divide-y">
          {threads.map((t) => {
            const customer = customerById.get(t.customer_id);
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/chat/${t.id}`}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {customer?.full_name || customer?.phone || "Customer"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(t.last_message_at).toLocaleString()}
                    </p>
                  </div>
                  <AdminBadge tone={t.status === "open" ? "positive" : "neutral"}>
                    {t.status}
                  </AdminBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
