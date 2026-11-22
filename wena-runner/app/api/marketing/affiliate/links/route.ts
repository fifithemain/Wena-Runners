import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { getCurrentProfile } from "@/lib/current-profile";

export const dynamic = "force-dynamic";
function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Growth services are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in first.", 401);
    const body = await request.json().catch(() => ({}));
    const destination = typeof body.destinationPath === "string" ? body.destinationPath.trim() : "/";
    const channel = typeof body.channel === "string" ? body.channel : "direct";
    if (!destination.startsWith("/") || destination.startsWith("//") || destination.includes("\\") || destination.length > 300) return fail("Choose a valid WENA destination path.");
    if (!["direct","whatsapp","instagram","tiktok","facebook","youtube","other"].includes(channel)) return fail("Choose a valid channel.");
    const supabase = db();
    const { data: feature } = await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id",true).maybeSingle();
    if (!feature?.growth_enabled) return fail("WENA Growth is temporarily unavailable.",503);
    const { data: partner } = await supabase.from("marketing_partners").select("id").eq("profile_id", profile.id).eq("status", "active").maybeSingle();
    if (!partner) return fail("Apply for and activate your Affiliate role first.", 403);
    const { data: grant } = await supabase.from("marketing_partner_role_grants").select("id").eq("partner_id", partner.id).eq("role_key", "affiliate").eq("status", "active").maybeSingle();
    if (!grant) return fail("Your Affiliate access is not active.", 403);
    const campaignId = typeof body.campaignId === "string" && body.campaignId ? body.campaignId : null;
    if (campaignId) {
      const { data: campaignRole } = await supabase.from("marketing_campaign_roles").select("campaign_id").eq("campaign_id",campaignId).eq("role_key","affiliate").maybeSingle();
      const { data: campaign } = await supabase.from("marketing_campaigns").select("id,status").eq("id",campaignId).eq("status","active").maybeSingle();
      if (!campaignRole || !campaign) return fail("Choose an active Affiliate campaign.",409);
    }
    const code = randomBytes(6).toString("hex").toUpperCase();
    const { data, error } = await supabase.from("marketing_tracking_links")
      .insert({ partner_id: partner.id, campaign_id: campaignId, code, destination_path: destination, channel })
      .select("id,code,destination_path,channel,status,created_at").single();
    if (error) throw error;
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://wena-runners.vercel.app").replace(/\/$/, "");
    return NextResponse.json({ link: { ...data, url: `${base}/r/${code}` } }, { status: 201 });
  } catch (cause) {
    console.error("Affiliate link creation failed:", cause);
    return fail("We couldn't create your referral link. Please try again.", 500);
  }
}
