import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBookCta } from "@/components/site/mobile-book-cta";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      <SiteFooter />
      <MobileBookCta />
    </div>
  );
}
