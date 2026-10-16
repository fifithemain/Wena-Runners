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
    const { error } = await supabase
      .from("profiles")
      .update({ clerk_user_id: userId })
      .eq("id", existing.id);
    if (error) throw new Error(`Could not link the existing profile to Clerk: ${error.message}`);
    return existing;
  }

  const unsafeMetadata = user.unsafeMetadata || {};
  const requestedRole = metadataText(unsafeMetadata.role, 20);
  if (!["customer", "runner", "both"].includes(requestedRole)) {
    throw new Error("You do not have a WENA account yet. Please create an account and choose Customer, Runner, or Both.");
  }
  const role = requestedRole;
  const fullName =
    metadataText(unsafeMetadata.fullName, 120) ||
    user.fullName ||
    email.split("@")[0];
  const phone =
    metadataText(unsafeMetadata.phone, 40) ||
    user.primaryPhoneNumber?.phoneNumber ||
    "";
  const zone = metadataText(unsafeMetadata.zone, 120);
  if (!metadataText(unsafeMetadata.fullName, 120) || !phone || (role !== "customer" && !zone)) {
    throw new Error("You do not have a complete WENA account. Please create an account and choose Customer, Runner, or Both.");
  }

  const { data: shadow, error: shadowError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (shadowError || !shadow.user) {
    const { data: raced, error: raceLookupError } = await supabase
      .from("profiles")
      .select(fields)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (raceLookupError) {
      throw new Error(`Could not recover the Clerk profile after a concurrent sign-in: ${raceLookupError.message}`);
    }
    if (raced) return raced;
    throw new Error(
      `Could not create the profile's internal database identity: ${shadowError?.message || "Unknown Supabase Auth error"}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: shadow.user.id,
        clerk_user_id: userId,
        full_name: fullName,
        email,
        phone,
        role,
        zone: zone || null,
        is_verified: false,
      },
      { onConflict: "id" },
    )
    .select(fields)
    .single();

  if (profileError || !profile) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(shadow.user.id);
    const cleanupMessage = cleanupError ? ` Cleanup also failed: ${cleanupError.message}` : "";
    throw new Error(
      `Could not create the Clerk profile: ${profileError?.message || "Unknown profile error"}.${cleanupMessage}`,
    );
  }

  return profile;
}
