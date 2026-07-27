import Link from "next/link";

// The 9 tabs from the blueprint. Several point at stub pages until their
// phase lands (AI Assistance = Phase F/J, Top Tailors + Reviews = Phase G,
// Subscriptions = Phase F, Contact/Live Chat = Phase I) — shipping the full,
// clickable shell now beats a nav that silently does nothing for six tabs.
const TABS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/ai-assistance", label: "AI Assistance" },
  { href: "/top-tailors", label: "Top Tailors" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/reviews", label: "Reviews" },
  { href: "/orders", label: "My Orders" },
  { href: "/contact", label: "Help" },
  { href: "/live-chat", label: "Live Chat" },
];

export function MainNav() {
  return (
    <nav
      aria-label="Main"
      className="border-t border-line-soft bg-paper"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-indigo"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
