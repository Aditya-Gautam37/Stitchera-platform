import Link from "next/link";

// Customer-facing surfaces only — rendered from (site) and (customer)
// layouts specifically, not from (tailor) or (staff)/admin, which have
// their own separate layout files that never import this.
export function MobileBookCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-paper px-4 py-3 sm:hidden">
      <Link
        href="/book"
        className="block w-full rounded-full bg-indigo px-5 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-indigo-strong"
      >
        Book a pickup
      </Link>
    </div>
  );
}
