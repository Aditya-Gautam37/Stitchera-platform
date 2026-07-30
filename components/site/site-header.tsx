import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./account-menu";
import { MainNav } from "./main-nav";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { fullName: string | null; role: string; isTailor: boolean } | null = null;
  if (user) {
    const [{ data }, { data: tailor }] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
      supabase.from("tailors").select("id").eq("profile_id", user.id).maybeSingle(),
    ]);
    if (data) {
      profile = { fullName: data.full_name, role: data.role, isTailor: !!tailor };
    }
  }

  const { data: city } = await supabase
    .from("cities")
    .select("name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-sm text-paper">S</span>
          STITCHERA
        </Link>

        <span className="hidden shrink-0 items-center gap-1 text-sm text-ink-soft sm:flex">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 18s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" />
            <circle cx="10" cy="8" r="2.2" />
          </svg>
          {city?.name ?? "Kanpur"} <span className="text-xs">⌄</span>
        </span>

        <form
          action="/services"
          method="GET"
          role="search"
          className="order-last flex min-w-0 flex-1 basis-full sm:order-none sm:basis-auto"
        >
          <input
            type="search"
            name="q"
            placeholder="Search kurta, blouse, alteration…"
            className="w-full rounded-full border border-line bg-cotton px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-indigo"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <Link href="/cart" aria-label="Cart" className="hidden text-ink-soft transition-colors hover:text-indigo sm:block">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 5h2l1.2 9.4A1.5 1.5 0 007.7 15.7h7.1a1.5 1.5 0 001.48-1.28L17.5 8H5.4" strokeLinejoin="round" />
              <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
            </svg>
          </Link>
          <Link href="/book" className="hidden rounded-full bg-indigo px-4 py-2 text-sm font-semibold text-paper transition hover:bg-indigo-strong md:inline-flex">
            Book pickup
          </Link>
          <AccountMenu profile={profile} />
        </div>
      </div>
      <MainNav />
    </header>
  );
}
