import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Growth services are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function authorized(request: Request) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const supplied = request.headers.get("x-admin-password") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  if (!authorized(request)) return fail("Admin password is incorrect.", 401);
  try {
    const supabase = db();
    const [applications, grants, partners] = await Promise.all([
      supabase.from("marketing_partner_applications").select("id,partner_id,role_key,status,answers,terms_version,submitted_at,review_note").order("submitted_at", { ascending: false }).limit(200),
      supabase.from("marketing_partner_role_grants").select("id,partner_id,role_key,status,granted_at,suspended_at,revoked_at").order("granted_at", { ascending: false }).limit(300),
      supabase.from("marketing_partners").select("id,profile_id,display_name,status,created_at").order("created_at", { ascending: false }).limit(300),
    ]);
    const error = applications.error || grants.error || partners.error;
    if (error) throw error;
    const profileIds = (partners.data || []).map((p) => p.profile_id);
    const { data: profiles, error: profileError } = profileIds.length
      ? await supabase.from("profiles").select("id,full_name,email,role").in("id", profileIds)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const partnerMap = new Map((partners.data || []).map((p) => [p.id, { ...p, profile: profileMap.get(p.profile_id) || null }]));
    return NextResponse.json({
      applications: (applications.data || []).map((a) => ({ ...a, partner: partnerMap.get(a.partner_id) || null })),
      grants: (grants.data || []).map((g) => ({ ...g, partner: partnerMap.get(g.partner_id) || null })),
      growthEnabled: (await supabase.from("marketing_feature_flags").select("growth_enabled").eq("id", true).maybeSingle()).data?.growth_enabled === true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Growth admin load failed:", cause);
    return fail("Could not load Growth administration.", 503);
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return fail("Admin password is incorrect.", 401);
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = db();
    if (typeof body.applicationId === "string" && ["approved","declined","more_information"].includes(body.decision)) {
      const { data, error } = await supabase.rpc("admin_review_marketing_application", {
        p_application_id: body.applicationId,
        p_status: body.decision,
        p_admin_note: typeof body.note === "string" ? body.note.trim().slice(0,1000) : "",
        p_actor_profile_id: null,
      });
      if (error) return fail(error.message, 409);
      return NextResponse.json({ result: data });
    }
    if (typeof body.grantId === "string" && ["active","suspended","revoked"].includes(body.status)) {
      const { data, error } = await supabase.rpc("admin_set_marketing_role_status", {
        p_grant_id: body.grantId,
        p_status: body.status,
        p_reason: typeof body.reason === "string" ? body.reason.trim().slice(0,120) : "",
        p_actor_profile_id: null,
      });
      if (error) return fail(error.message, 409);
      return NextResponse.json({ result: data });
    }
    return fail("Invalid Growth administration action.");
  } catch (cause) {
    console.error("Growth admin action failed:", cause);
    return fail("The Growth administration action failed.", 500);
  }
}
