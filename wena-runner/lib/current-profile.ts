import { currentUser, auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  zone: string | null;
  is_verified: boolean;
};

function database() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function metadataText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    throw new Error("Clerk is not configured. Add its publishable and secret keys to the app environment.");
  }

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const emailAddress = user.primaryEmailAddress;
  const email = emailAddress?.emailAddress.trim().toLowerCase();
  if (!email || emailAddress?.verification?.status !== "verified") return null;

  const supabase = database();
  const fields = "id,full_name,email,phone,role,zone,is_verified";
  const { data: linked, error: lookupError } = await supabase
    .from("profiles")
    .select(fields)
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (lookupError) throw new Error(`Could not look up the Clerk profile: ${lookupError.message}`);
  if (linked) return linked;

  const { data: existing, error: emailError } = await supabase
    .from("profiles")
    .select(fields)
    .eq("email", email)
    .maybeSingle();
  if (emailError) throw new Error(`Could not match the existing profile: ${emailError.message}`);

  if (existing) {
    // Never transfer an already-linked WENA profile to a different Clerk identity.
    if (existing.clerk_user_id && existing.clerk_user_id !== userId) return null;
    if (!existing.clerk_user_id) {
      const { data: linked, error } = await supabase
        .from("profiles")
        .update({ clerk_user_id: userId })
        .eq("id", existing.id)
        .is("clerk_user_id", null)
        .select(fields)
        .maybeSingle();
      if (error) throw new Error(`Could not link the existing profile to Clerk: ${error.message}`);
      if (!linked) return null;
      return linked;
    }
    return existing;
  }

  // Sign-in must never create a WENA profile. Profile creation happens only
  // through the explicit signup completion endpoint.
  return null;
}
