import Link from "next/link";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Your cart</h1>
      <p className="mt-3 text-ink-soft">
        Stitchera books one service at a time rather than a shopping cart —
        each booking becomes an order you can track from My Orders.
      </p>
      <Link
        href="/book"
        className="mt-6 inline-block rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
      >
        Book a service
      </Link>
    </div>
  );
}
