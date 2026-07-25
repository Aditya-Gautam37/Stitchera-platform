import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const { q } = await searchParams;
  const supabase = await createClient();

  let customerIds: string[] | null = null;
  if (profile.role !== "admin" && profile.city_id) {
    const { data: cityOrders } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("city_id", profile.city_id);
    customerIds = Array.from(
      new Set((cityOrders ?? []).map((o) => o.customer_id))
    );
  }

  let customers: {
    id: string;
    full_name: string | null;
    phone: string | null;
    is_active: boolean;
    created_at: string;
  }[] = [];

  if (!customerIds || customerIds.length > 0) {
    // Two separate .ilike() calls instead of building a `.or()` filter
    // string by hand: `.or()` parses its argument as a small DSL where
    // commas and parentheses are syntax (clause separators), so
    // interpolating raw search input into it (`.or(`a.ilike.%${q}%,...`)`)
    // let a search term containing a comma or parenthesis alter which
    // clauses PostgREST actually parsed out of the string. `.ilike()`
    // takes its value as a bound parameter with no such parsing step.
    const base = () =>
      supabase
        .from("profiles")
        .select("id, full_name, phone, is_active, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false })
        .limit(100);

    if (q) {
      const [byName, byPhone] = await Promise.all([
        (customerIds ? base().in("id", customerIds) : base()).ilike(
          "full_name",
          `%${q}%`
        ),
        (customerIds ? base().in("id", customerIds) : base()).ilike(
          "phone",
          `%${q}%`
        ),
      ]);
      const merged = new Map(
        [...(byName.data ?? []), ...(byPhone.data ?? [])].map((c) => [c.id, c])
      );
      customers = Array.from(merged.values()).slice(0, 100);
    } else {
      const query = customerIds ? base().in("id", customerIds) : base();
      const { data } = await query;
      customers = data ?? [];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <form className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name or phone"
            className="rounded border px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
            Search
          </button>
        </form>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Phone</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="py-2">
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.full_name || "—"}
                </Link>
              </td>
              <td className="py-2">{c.phone}</td>
              <td className="py-2">{c.is_active ? "Active" : "Inactive"}</td>
              <td className="py-2 text-zinc-500">
                {new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!customers.length && (
        <p className="text-sm text-zinc-500">No customers found.</p>
      )}
    </div>
  );
}
