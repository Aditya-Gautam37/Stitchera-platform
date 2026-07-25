import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "city_manager" | "pickup_agent";

export type StaffProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: StaffRole;
  city_id: string | null;
};

const STAFF_ROLES: readonly string[] = [
  "admin",
  "city_manager",
  "pickup_agent",
];

export async function requireStaff(): Promise<StaffProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, city_id")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile as StaffProfile;
}

export async function requireAdmin(): Promise<StaffProfile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin");
  return profile;
}

export function isAdmin(profile: StaffProfile) {
  return profile.role === "admin";
}
