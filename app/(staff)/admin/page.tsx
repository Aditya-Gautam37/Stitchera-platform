import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

type OrderStatRow = {
  status: OrderStatus;
  order_count: number;
  revenue_paid: number;
  placed_last_30d: number;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function AdminOverviewPage() {
  const profile = await requireStaff();
  const supabase = await createClient();

  // Aggregated in SQL (order_stats()) rather than pulling every order row —
  // RLS still scopes this to the caller's city for city_manager/pickup_agent,
  // and to every city for admin.
  const { data: stats, error } = await supabase.rpc("order_stats");
  if (error) console.error("[admin-overview]", error);

  const rows = (stats ?? []) as OrderStatRow[];
  const byStatus = new Map(rows.map((r) => [r.status, r]));

  const total = rows.reduce((sum, r) => sum + Number(r.order_count), 0);
  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue_paid), 0);
  const recentCount = rows.reduce(
    (sum, r) => sum + Number(r.placed_last_30d),
    0
  );
  const maxStatusCount = Math.max(
    1,
    ...rows.map((r) => Number(r.order_count))
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-zinc-500">
          {profile.role === "admin" ? "All cities" : "Your city"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Total orders" value={total.toLocaleString("en-IN")} />
        <StatTile label="Revenue collected" value={formatCurrency(revenue)} />
        <StatTile
          label="Orders, last 30 days"
          value={recentCount.toLocaleString("en-IN")}
        />
      </div>

      <div>
        <h2 className="text-lg font-medium">Orders by status</h2>
        <div className="mt-4 flex flex-col gap-3">
          {ORDER_STATUSES.map((status) => {
            const count = Number(byStatus.get(status)?.order_count ?? 0);
            const width = total === 0 ? 0 : (count / maxStatusCount) * 100;
            return (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-zinc-600 dark:text-zinc-400">
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-blue-600 dark:bg-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-zinc-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
