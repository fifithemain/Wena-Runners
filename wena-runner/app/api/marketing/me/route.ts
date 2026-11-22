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

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in to open WENA Growth.", 401);
    const supabase = db();
    const { data: flag, error: flagError } = await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id", true).maybeSingle();
    if (flagError) throw flagError;
    if (!flag?.growth_enabled) return NextResponse.json({ enabled: false, message: "WENA Growth is being prepared. Your normal WENA account remains unchanged." }, { headers: { "Cache-Control": "no-store" } });

    const { data: partner, error: partnerError } = await supabase.from("marketing_partners").select("id,display_name,status,created_at").eq("profile_id", profile.id).maybeSingle();
    if (partnerError) throw partnerError;
    if (!partner) return NextResponse.json({ enabled: true, profile: { fullName: profile.full_name, role: profile.role }, partner: null, grants: [], applications: [], links: [], assignments: [], ledger: [] }, { headers: { "Cache-Control": "no-store" } });

    const [grants, applications, links, assignments, ledger, eligibleRoles] = await Promise.all([
      supabase.from("marketing_partner_role_grants").select("id,role_key,status,granted_at,terms_version").eq("partner_id", partner.id).order("role_key"),
      supabase.from("marketing_partner_applications").select("id,role_key,status,submitted_at,reviewed_at,review_note").eq("partner_id", partner.id).order("submitted_at", { ascending: false }),
      supabase.from("marketing_tracking_links").select("id,code,destination_path,channel,status,created_at").eq("partner_id", partner.id).order("created_at", { ascending: false }),
      supabase.from("marketing_campaign_assignments").select("id,campaign_id,role_key,status,agreed_fee_zar,terms,invited_at,accepted_at,campaign:marketing_campaigns(name,description,status),deliverables:marketing_creator_deliverables(id,title,brief,due_at,status,submission_note,submission_path)").eq("partner_id", partner.id).order("invited_at", { ascending: false }),
      supabase.from("marketing_reward_ledger").select("id,role_key,entry_type,reward_type,amount_zar,description,created_at").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("marketing_campaign_roles").select("campaign_id").eq("role_key","affiliate"),
    ]);
    const error = grants.error || applications.error || links.error || assignments.error || ledger.error || eligibleRoles.error;
    if (error) throw error;
    return NextResponse.json({
      enabled: true, profile: { fullName: profile.full_name, role: profile.role },
      partner, grants: grants.data || [], applications: applications.data || [],
      links: links.data || [], assignments: assignments.data || [], ledger: ledger.data || [],
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (cause) {
    console.error("Growth profile load failed:", cause);
    return fail("We couldn't load your Growth workspace. Please try again.", 503);
  }
}
