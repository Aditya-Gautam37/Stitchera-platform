import Link from "next/link";
import { buttonClass } from "@/components/ui/styles";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Your cart</h1>
      <p className="mt-3 text-ink-soft">
        Stitchera books one service at a time rather than a shopping cart —
        each booking becomes an order you can track from My Orders.
      </p>
      <Link href="/book" className={`mt-6 ${buttonClass("primary", "sm")}`}>
        Book a service
      </Link>
    </div>
  );
}
