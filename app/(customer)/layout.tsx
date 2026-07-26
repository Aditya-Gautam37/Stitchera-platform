import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBookCta } from "@/components/site/mobile-book-cta";

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

  // A tailor identity is "a tailors row with profile_id = you," independent
  // of profiles.role (see 0012) — so this check can't live in the role
  // branch above. Whoever's logged in, if they're also a linked tailor,
  // their default area is /tailor, not the customer dashboard.
  const { data: tailor } = await supabase
    .from("tailors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (tailor) redirect("/tailor");

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-24 sm:pb-8">
        {children}
      </main>
      <SiteFooter />
      <MobileBookCta />
    </div>
  );
}
