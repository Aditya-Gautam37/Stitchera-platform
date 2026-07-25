import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TailorProfile = {
  id: string;
  name: string;
  shop_name: string | null;
  city_id: string;
  status: string;
};

// A tailor identity is "a tailors row with profile_id = you," independent
// of profiles.role — see 0012's migration note. Not every signed-in user
// has one; this redirects those who don't rather than erroring, since
// landing here without a linked tailor account is a routing mistake, not
// an authorization failure.
export async function requireTailor(): Promise<TailorProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tailor } = await supabase
    .from("tailors")
    .select("id, name, shop_name, city_id, status")
    .eq("profile_id", user.id)
    .single();

  if (!tailor) redirect("/dashboard");

  return tailor;
}
