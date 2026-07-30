import Link from "next/link";

const TABS = [
  { href: "/services", label: "Services" },
  { href: "/book", label: "Book Tailor" },
  { href: "/measurements", label: "Measurements" },
  { href: "/track", label: "Track Order" },
  { href: "/top-tailors", label: "Tailors" },
  { href: "/#roadmap", label: "Our Model" },
  { href: "/contact", label: "Help" },
];

export function MainNav() {
  return (
    <nav aria-label="Main" className="border-t border-line-soft bg-paper/95">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className="shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-indigo">
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
