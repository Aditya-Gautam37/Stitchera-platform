import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type OrderStatus } from "@/lib/constants";
import { OrderTimeline } from "@/components/site/order-timeline";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order_number?: string; phone?: string }>;
}) {
  const { order_number, phone } = await searchParams;
  const supabase = await createClient();

  let result: { order_number: string; status: string } | null = null;
  let notFoundMessage: string | null = null;

  if (order_number && phone) {
    // track_order() is a SECURITY DEFINER RPC, not a direct table query —
    // orders has no RLS policy letting an anonymous visitor read any row,
    // and a broad one would leak every order to anyone who omitted the
    // filters. The function does the exact-match check itself and returns
    // only order_number + status, nothing financial or personal.
    const { data } = await supabase.rpc("track_order", {
      p_order_number: order_number,
      p_phone: phone,
    });

    if (data?.length) {
      result = data[0];
    } else {
      notFoundMessage = "No order found with that number and phone combination.";
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Track your order</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Enter your order number and the phone number you booked with.
      </p>

      <form className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Order number
          <input
            type="text"
            name="order_number"
            placeholder="STC-26-1042"
            defaultValue={order_number}
            required
            className="rounded border border-line bg-paper px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone number
          <input
            type="tel"
            name="phone"
            defaultValue={phone}
            required
            className="rounded border border-line bg-paper px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Track
        </button>
      </form>

      {notFoundMessage && (
        <p className="mt-4 text-sm text-thread-red">{notFoundMessage}</p>
      )}
      {result && (
        <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
          <p className="font-mono text-sm text-ink-soft">{result.order_number}</p>
          <div className="mt-4">
            <OrderTimeline status={result.status as OrderStatus} />
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Signed in? <Link href="/orders" className="text-indigo underline">See all your orders</Link>
      </p>
    </div>
  );
}
