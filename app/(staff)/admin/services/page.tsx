import Link from "next/link";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, garment_type, base_price, est_days, is_active")
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Service catalog</h1>
        <Link
          href="/admin/services/new"
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          Add service
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium">Base price</th>
            <th className="py-2 font-medium">Days</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {services?.map((s) => (
            <tr key={s.id}>
              <td className="py-2">
                <Link
                  href={`/admin/services/${s.id}`}
                  className="font-medium hover:underline"
                >
                  {s.name}
                </Link>
              </td>
              <td className="py-2">
                {s.category} / {s.garment_type}
              </td>
              <td className="py-2">₹{s.base_price}</td>
              <td className="py-2">{s.est_days}</td>
              <td className="py-2">{s.is_active ? "Active" : "Inactive"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
