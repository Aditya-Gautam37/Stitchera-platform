import Link from "next/link";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { requestAccountDeletion } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .single();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total")
    .eq("customer_id", user!.id)
    .order("placed_at", { ascending: false })
    .limit(5);

  const { data: pendingDeletion } = await supabase
    .from("deletion_requests")
    .select("id, created_at")
    .eq("profile_id", user!.id)
    .eq("status", "pending")
    .maybeSingle();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-sm text-ink-soft">{profile?.phone}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/book"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Book a service
        </Link>
        <Link
          href="/measurements"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-indigo"
        >
          My measurements
        </Link>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-ink">Recent orders</h2>
        {!orders?.length ? (
          <p className="mt-2 text-sm text-ink-soft">
            No orders yet — book your first one!
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft">
            {orders.map((order) => (
              <li key={order.id} className="py-3">
                <Link
                  href={`/orders/${order.id}`}
                  className="flex justify-between text-sm text-ink hover:text-indigo"
                >
                  <span>
                    {order.order_number} ·{" "}
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </span>
                  <span className="font-medium">₹{order.grand_total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line-soft pt-6">
        <h2 className="font-display text-lg font-bold text-ink">Your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          See our{" "}
          <Link href="/privacy" className="text-indigo underline">
            Privacy Policy
          </Link>{" "}
          for what we collect and why.
        </p>

        {pendingDeletion ? (
          <p className="mt-3 text-sm text-ink-soft">
            Deletion request submitted{" "}
            {new Date(pendingDeletion.created_at).toLocaleDateString()} — our
            team will confirm with you before anything is removed.
          </p>
        ) : (
          <form action={requestAccountDeletion} className="mt-3 flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Request account deletion (optional reason)
              <textarea
                name="reason"
                placeholder="Optional — why are you leaving?"
                className="rounded border border-line bg-paper px-3 py-2"
              />
            </label>
            <SubmitButton
              pendingText="Submitting..."
              className="w-fit rounded-full border border-thread-red px-4 py-2 text-sm text-thread-red disabled:opacity-50"
            >
              Request account deletion
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
