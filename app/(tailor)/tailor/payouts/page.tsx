import { requireTailor } from "@/lib/dal/tailor";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cardClass } from "@/components/ui/styles";

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default async function TailorPayoutsPage() {
  const tailor = await requireTailor();
  const supabase = await createClient();

  const { data: payouts } = await supabase
    .from("tailor_payouts")
    .select("id, period_start, period_end, order_count, gross_amount, commission, net_payable, paid_at, reference")
    .eq("tailor_id", tailor.id)
    .order("period_start", { ascending: false });

  const rows = payouts ?? [];
  const totalPaid = rows
    .filter((p) => p.paid_at)
    .reduce((sum, p) => sum + Number(p.net_payable), 0);
  const totalPending = rows
    .filter((p) => !p.paid_at)
    .reduce((sum, p) => sum + Number(p.net_payable), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink">Payouts</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 ${cardClass}`}>
          <p className="text-sm text-ink-soft">Paid to date</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatINR(totalPaid)}</p>
        </div>
        <div className={`p-4 ${cardClass}`}>
          <p className="text-sm text-ink-soft">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatINR(totalPending)}</p>
        </div>
      </div>

      {!rows.length ? (
        <p className="text-sm text-ink-soft">
          No payout periods recorded yet. These are settled by Stitchera staff.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {new Date(p.period_start).toLocaleDateString()} –{" "}
                  {new Date(p.period_end).toLocaleDateString()}
                </p>
                <p className="text-sm text-ink-soft">
                  {p.order_count} order{p.order_count === 1 ? "" : "s"} · commission{" "}
                  {formatINR(Number(p.commission))}
                </p>
                {p.reference && (
                  <p className="text-xs text-ink-soft">Ref: {p.reference}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">
                  {formatINR(Number(p.net_payable))}
                </p>
                <Badge tone={p.paid_at ? "active" : "attention"}>
                  {p.paid_at
                    ? `Paid ${new Date(p.paid_at).toLocaleDateString()}`
                    : "Pending"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
