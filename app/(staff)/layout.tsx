import Link from "next/link";
import { requireStaff } from "@/lib/dal/staff";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS: {
  href: string;
  label: string;
  roles: Array<"admin" | "city_manager" | "pickup_agent">;
}[] = [
  { href: "/admin", label: "Overview", roles: ["admin", "city_manager", "pickup_agent"] },
  { href: "/admin/orders", label: "Orders", roles: ["admin", "city_manager", "pickup_agent"] },
  { href: "/admin/customers", label: "Customers", roles: ["admin", "city_manager"] },
  { href: "/admin/tailors", label: "Tailors", roles: ["admin", "city_manager"] },
  { href: "/admin/applications", label: "Applications", roles: ["admin", "city_manager"] },
  { href: "/admin/services", label: "Services", roles: ["admin"] },
  { href: "/admin/cities", label: "Cities & Pricing", roles: ["admin"] },
  { href: "/admin/staff", label: "Staff", roles: ["admin"] },
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-full">
      <aside className="flex w-56 flex-col justify-between border-r px-4 py-6">
        <div className="flex flex-col gap-1">
          <p className="mb-4 px-2 text-lg font-semibold">Stitchera Staff</p>
          <nav className="flex flex-col gap-1 text-sm">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t pt-4 text-xs text-zinc-500">
          <p>{profile.full_name ?? profile.phone}</p>
          <p className="uppercase tracking-wide">{profile.role.replace("_", " ")}</p>
          <form action={logout}>
            <button type="submit" className="underline">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
