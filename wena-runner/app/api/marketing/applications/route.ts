import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Growth services are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const TERMS_VERSION = "2026-11-22-v1";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in to apply.", 401);
    const body = await request.json().catch(() => ({}));
    const roleKey = body.roleKey;
    if (!["affiliate", "creator"].includes(roleKey)) return fail("Choose Affiliate or Creator.");
    if (body.termsAccepted !== true) return fail("Please accept the programme terms before applying.");
    const supabase = db();
    const { data: flag, error: flagError } = await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id", true).maybeSingle();
    if (flagError || !flag?.growth_enabled) return fail("WENA Growth applications are not open yet.", 503);

    const { data: partner, error: partnerError } = await supabase.from("marketing_partners")
      .upsert({ profile_id: profile.id, display_name: profile.full_name || "WENA Partner" }, { onConflict: "profile_id", ignoreDuplicates: true })
      .select("id,status").maybeSingle();
    if (partnerError) return fail("Could not create your Growth profile. Please try again.", 500);
    let partnerRow = partner;
    if (!partnerRow) {
      const { data, error } = await supabase.from("marketing_partners").select("id,status").eq("profile_id", profile.id).single();
      if (error) return fail("Could not load your Growth profile.", 500);
      partnerRow = data;
    }
    if (partnerRow.status !== "active") return fail("This Growth profile is currently paused. Contact WENA support.", 403);

    const existingGrant = await supabase.from("marketing_partner_role_grants").select("id,status").eq("partner_id", partnerRow.id).eq("role_key", roleKey).maybeSingle();
    if (existingGrant.data?.status === "active") return fail("You already have this Growth role.", 409);
    const answers = {
      motivation: typeof body.motivation === "string" ? body.motivation.trim().slice(0, 1200) : "",
      platforms: Array.isArray(body.platforms) ? body.platforms.filter((v: unknown) => typeof v === "string").slice(0, 6).map((v: string) => v.slice(0, 40)) : [],
      audience: typeof body.audience === "string" ? body.audience.trim().slice(0, 300) : "",
      portfolioUrl: typeof body.portfolioUrl === "string" && /^https:\/\//i.test(body.portfolioUrl) ? body.portfolioUrl.slice(0, 500) : "",
    };
    if (answers.motivation.length < 20) return fail("Tell us a little more about why you want to join (at least 20 characters).");
    const { data: application, error: insertError } = await supabase.from("marketing_partner_applications")
      .insert({ partner_id: partnerRow.id, role_key: roleKey, answers, terms_version: TERMS_VERSION })
      .select("id,role_key,status,submitted_at").single();
    if (insertError?.code === "23505") return fail("You already have an application under review for this role.", 409);
    if (insertError) return fail("Your application could not be submitted. Please try again.", 500);
    await supabase.from("marketing_audit_log").insert({
      actor_profile_id: profile.id, action: "application_submitted",
      target_type: "marketing_partner_application", target_id: application.id,
      metadata: { role_key: roleKey, terms_version: TERMS_VERSION },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (cause) {
    console.error("Growth application failed:", cause);
    return fail("We couldn't submit your application. Please try again.", 500);
  }
}
