import { requireAdmin } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { updatePlan } from "./actions";

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("key, name, tagline, price, billing_period_days, is_active")
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Subscription plans</h1>
      <p className="text-sm text-zinc-500">
        Prices shown on the public /subscriptions page and charged by
        purchase_subscription() come directly from this table.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(plans ?? []).map((plan) => (
          <form
            key={plan.key}
            action={updatePlan}
            className="flex flex-col gap-3 rounded border p-4"
          >
            <input type="hidden" name="key" value={plan.key} />
            <p className="font-medium capitalize">{plan.key}</p>
            <label className="flex flex-col gap-1 text-sm">
              Name
              <input
                type="text"
                name="name"
                defaultValue={plan.name}
                required
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tagline
              <input
                type="text"
                name="tagline"
                defaultValue={plan.tagline}
                required
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Price (₹)
              <input
                type="number"
                name="price"
                min={0}
                step="0.01"
                defaultValue={plan.price}
                required
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Billing period (days)
              <input
                type="number"
                name="billing_period_days"
                min={1}
                defaultValue={plan.billing_period_days}
                required
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={plan.is_active}
              />
              Active (visible to customers)
            </label>
            <button
              type="submit"
              className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white"
            >
              Save
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
