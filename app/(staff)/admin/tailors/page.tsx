import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { AdminBadge } from "@/components/ui/admin-badge";
import { adminButtonClass, adminTableRowClass } from "@/components/ui/admin-styles";
import { ADMIN_TAILOR_STATUS_TONE } from "@/lib/admin-status-tone";

export default async function TailorsPage() {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const supabase = await createClient();
  let query = supabase
    .from("tailors")
    .select("id, name, phone, shop_name, status, rating, total_orders")
    .order("name");

  if (profile.role !== "admin" && profile.city_id) {
    query = query.eq("city_id", profile.city_id);
  }

  const { data: tailors } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tailors</h1>
        <Link href="/admin/tailors/new" className={adminButtonClass("primary", "sm")}>
          Add tailor
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Shop</th>
            <th className="py-2 font-medium">Phone</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Rating</th>
            <th className="py-2 font-medium">Orders</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tailors?.map((t) => (
            <tr key={t.id} className={adminTableRowClass}>
              <td className="py-2">
                <Link
                  href={`/admin/tailors/${t.id}`}
                  className="font-medium hover:underline"
                >
                  {t.name}
                </Link>
              </td>
              <td className="py-2">{t.shop_name || "—"}</td>
              <td className="py-2">{t.phone}</td>
              <td className="py-2">
                <AdminBadge tone={ADMIN_TAILOR_STATUS_TONE[t.status] ?? "neutral"}>
                  {t.status.replace(/_/g, " ")}
                </AdminBadge>
              </td>
              <td className="py-2">{t.rating ?? "—"}</td>
              <td className="py-2">{t.total_orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tailors?.length && (
        <p className="text-sm text-zinc-500">No tailors yet.</p>
      )}
    </div>
  );
}
