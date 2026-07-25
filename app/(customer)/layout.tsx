import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile && profile.role !== "customer") redirect("/admin");
  if (!profile?.full_name) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b px-8 py-4">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/book">Book</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/measurements">Measurements</Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Log out
          </button>
        </form>
      </header>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
