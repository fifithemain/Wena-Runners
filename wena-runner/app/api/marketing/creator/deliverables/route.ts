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

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in first.", 401);
    const body = await request.json().catch(() => ({}));
    if (typeof body.deliverableId !== "string") return fail("Choose a valid deliverable.");
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1500) : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!note && !url) return fail("Add a submission note or content URL.");
    if (url && (!/^https:\/\//i.test(url) || url.length > 1000)) return fail("Submission URLs must use HTTPS.");
    const supabase = db();
    const { data: partner } = await supabase.from("marketing_partners").select("id").eq("profile_id", profile.id).eq("status", "active").maybeSingle();
    if (!partner) return fail("Growth profile not found.", 403);
    const { data: grant } = await supabase.from("marketing_partner_role_grants").select("id").eq("partner_id", partner.id).eq("role_key", "creator").eq("status", "active").maybeSingle();
    if (!grant) return fail("Your Creator access is not active.", 403);
    const { data: deliverable, error: lookupError } = await supabase.from("marketing_creator_deliverables")
      .select("id,assignment:marketing_campaign_assignments!inner(partner_id,role_key,status)")
      .eq("id", body.deliverableId).maybeSingle();
    if (lookupError) throw lookupError;
    const assignment = Array.isArray(deliverable?.assignment) ? deliverable.assignment[0] : deliverable?.assignment;
    if (!deliverable || !assignment || assignment.partner_id !== partner.id || assignment.role_key !== "creator" || !["accepted","in_progress"].includes(assignment.status)) {
      return fail("This deliverable is not available for submission.", 403);
    }
    const { data, error } = await supabase.from("marketing_creator_deliverables").update({
      submission_note: [note,url].filter(Boolean).join("\n").slice(0,2000),
      submission_path: url || null, status: "submitted", submitted_at: new Date().toISOString(),
    }).eq("id", body.deliverableId).in("status", ["not_started","changes_requested"])
      .select("id,status,submitted_at").maybeSingle();
    if (error) throw error;
    if (!data) return fail("This deliverable has already been submitted or is no longer available.", 409);
    await supabase.from("marketing_audit_log").insert({actor_profile_id:profile.id,action:"creator_deliverable_submitted",target_type:"marketing_creator_deliverable",target_id:data.id,metadata:{assignment_id:assignment.id}});
    return NextResponse.json({ deliverable: data });
  } catch (cause) {
    console.error("Creator submission failed:", cause);
    return fail("We couldn't submit your content. Please try again.", 500);
  }
}
