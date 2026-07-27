import Link from "next/link";
import { requireTailor } from "@/lib/dal/tailor";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function TailorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tailor = await requireTailor();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between border-b border-line-soft pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo">
              Tailor dashboard
            </p>
            <p className="font-display text-lg font-bold text-ink">
              {tailor.shop_name || tailor.name}
            </p>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-ink-soft">
            <Link href="/tailor" className="transition-colors hover:text-indigo">
              Overview
            </Link>
            <Link href="/tailor/orders" className="transition-colors hover:text-indigo">
              Orders
            </Link>
            <Link href="/tailor/payouts" className="transition-colors hover:text-indigo">
              Payouts
            </Link>
          </nav>
        </div>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
