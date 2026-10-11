import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export type V3Profile = {
  id: string;
  email?: string;
  full_name?: string;
  role: "customer" | "runner" | "admin";
  status?: string;
};

/** Resolve identity from a validated Supabase Auth access token cookie. */
export async function requireProfile(roles?: V3Profile["role"][]) {
  const token = cookies().get("wena_runner_session")?.value;
  if (!token) return { profile: null, error: "Not authenticated" as const };

  const supabase = supabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return { profile: null, error: "Not authenticated" as const };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error || !profile) return { profile: null, error: "Profile not found" as const };
  if (roles && !roles.includes(profile.role)) return { profile: null, error: "Forbidden" as const };
  return { profile: profile as V3Profile, error: null };
}

export async function requireAdminPassword(req: Request) {
  const supplied = req.headers.get("x-admin-password");
  const configured = process.env.ADMIN_PASSWORD;
  return !!supplied && !!configured && supplied === configured;
}
