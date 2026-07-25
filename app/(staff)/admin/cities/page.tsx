import Link from "next/link";
import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

export default async function CitiesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cities } = await supabase
    .from("cities")
    .select("*")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cities</h1>
        <Link
          href="/admin/cities/new"
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          Add city
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">State</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Visit charge</th>
            <th className="py-2 font-medium">Delivery charge</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {cities?.map((c) => (
            <tr key={c.id}>
              <td className="py-2">
                <Link
                  href={`/admin/cities/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className="py-2">{c.state}</td>
              <td className="py-2">{c.is_active ? "Active" : "Inactive"}</td>
              <td className="py-2">₹{c.visit_charge}</td>
              <td className="py-2">₹{c.delivery_charge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
