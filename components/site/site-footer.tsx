import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-ink">Stitchera</p>
          <p className="mt-2 text-sm text-ink-soft">
            Doorstep tailoring — pickup, stitch, deliver. Currently serving Kanpur.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Company</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/contact" className="transition-colors hover:text-indigo">Contact us</Link></li>
            <li><Link href="/faq" className="transition-colors hover:text-indigo">FAQ</Link></li>
            <li><Link href="/tailor-registration" className="transition-colors hover:text-indigo">Register as a tailor</Link></li>
            <li><Link href="/delivery-registration" className="transition-colors hover:text-indigo">Register as a delivery partner</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Account</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/login" className="transition-colors hover:text-indigo">Sign in</Link></li>
            <li><Link href="/orders" className="transition-colors hover:text-indigo">Track an order</Link></li>
            <li><Link href="/subscriptions" className="transition-colors hover:text-indigo">Subscription plans</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line-soft px-4 py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Stitchera. All rights reserved.
      </div>
    </footer>
  );
}
