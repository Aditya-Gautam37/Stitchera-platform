import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { formatMeasurementSummary } from "@/lib/measurements";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { MeasurementFields } from "@/components/measurement-fields";
import { SubmitButton } from "@/components/submit-button";
import { adminButtonClass } from "@/components/ui/admin-styles";
import { recordCustomerMeasurement } from "./actions";
import { grantSubscription } from "./subscription-actions";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, is_active, created_at")
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (!customer) notFound();

  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, status, grand_total, city_id, placed_at")
    .eq("customer_id", id)
    .order("placed_at", { ascending: false });

  if (profile.role !== "admin" && profile.city_id) {
    ordersQuery = ordersQuery.eq("city_id", profile.city_id);
  }

  const { data: orders } = await ordersQuery;

  // Non-admin staff only get here via the customer list, which is already
  // scoped to their city — an empty result means this customer isn't theirs.
  if (profile.role !== "admin" && (!orders || orders.length === 0)) {
    notFound();
  }

  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, line1, line2, landmark, pincode, is_default")
    .eq("profile_id", id);

  const { data: measurements } = await supabase
    .from("measurements")
    .select("id, label, garment_type, person_name, values, notes, is_active")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  const { data: subscriptions } =
    profile.role === "admin"
      ? await supabase
          .from("customer_subscriptions")
          .select("id, plan, status, started_at")
          .eq("profile_id", id)
          .order("started_at", { ascending: false })
      : { data: null };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {customer.full_name || "Unnamed customer"}
        </h1>
        <p className="text-sm text-zinc-500">
          {customer.phone} · {customer.email || "no email"}
        </p>
        <p className="text-sm text-zinc-500">
          {customer.is_active ? "Active" : "Inactive"} · joined{" "}
          {new Date(customer.created_at).toLocaleDateString()}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Orders</h2>
        {!orders?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No orders yet.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {orders.map((o) => (
              <li key={o.id} className="py-2">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex justify-between hover:underline"
                >
                  <span>
                    {o.order_number} · {o.status.replace(/_/g, " ")}
                  </span>
                  <span>₹{o.grand_total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Addresses</h2>
        {!addresses?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No saved addresses.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {addresses.map((a) => (
              <li key={a.id} className="py-2">
                {a.label && <span className="font-medium">{a.label}: </span>}
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                {a.landmark ? `, ${a.landmark}` : ""} — {a.pincode}
                {a.is_default && (
                  <span className="ml-2 text-xs text-zinc-500">(default)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Measurements</h2>
        {!measurements?.length ? (
          <p className="mt-2 text-sm text-zinc-500">No saved measurements.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {measurements.map((m) => (
              <li key={m.id} className="py-2">
                <p className="font-medium">
                  {m.label}
                  <span className="ml-2 font-normal text-zinc-500">
                    {m.garment_type}
                    {m.person_name ? ` · ${m.person_name}` : ""}
                    {!m.is_active ? " · inactive" : ""}
                  </span>
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {formatMeasurementSummary(m.values)}
                </p>
                {m.notes && <p className="text-zinc-500">{m.notes}</p>}
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Record measurements for this customer
          </summary>
          <form
            action={recordCustomerMeasurement}
            className="mt-4 flex flex-col gap-5 rounded border p-4"
          >
            <input type="hidden" name="customer_id" value={customer.id} />
            <MeasurementFields />
            <SubmitButton
              pendingText="Saving..."
              className={`w-fit ${adminButtonClass("primary", "md")}`}
            >
              Save measurements
            </SubmitButton>
          </form>
        </details>
      </div>

      {profile.role === "admin" && (
        <div>
          <h2 className="text-lg font-medium">Subscription</h2>
          {!subscriptions?.length ? (
            <p className="mt-2 text-sm text-zinc-500">No subscription.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {subscriptions.map((s) => (
                <li key={s.id} className="py-2">
                  {s.plan} · {s.status} · since{" "}
                  {new Date(s.started_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
          <form
            action={grantSubscription}
            className="mt-3 flex items-center gap-2"
          >
            <input type="hidden" name="customer_id" value={customer.id} />
            <select name="plan" className="rounded border px-2 py-1.5 text-sm">
              {SUBSCRIPTION_PLANS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
            <SubmitButton pendingText="Granting..." className={adminButtonClass("secondary", "sm")}>
              Grant subscription
            </SubmitButton>
          </form>
          <p className="mt-1 text-xs text-zinc-500">
            Stopgap until the real subscription purchase flow ships — lets a
            customer who&apos;s used their 3 free bookings keep going.
          </p>
        </div>
      )}
    </div>
  );
}
