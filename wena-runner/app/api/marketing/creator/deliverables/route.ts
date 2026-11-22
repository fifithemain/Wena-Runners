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
    const { data: assignment } = await supabase.from("marketing_campaign_assignments").select("id").eq("partner_id", partner.id).eq("role_key", "creator").in("status", ["accepted","in_progress"]).maybeSingle();
    if (!assignment) return fail("You have no active creator assignment.", 409);
    const { data, error } = await supabase.from("marketing_creator_deliverables").update({
      submission_note: [note,url].filter(Boolean).join("\\n").slice(0,2000),
      submission_path: url || null, status: "submitted", submitted_at: new Date().toISOString(),
    }).eq("id", body.deliverableId).eq("assignment_id", assignment.id).in("status", ["not_started","changes_requested"])
      .select("id,status,submitted_at").maybeSingle();
    if (error) throw error;
    if (!data) return fail("This deliverable is not available for submission.", 409);
    return NextResponse.json({ deliverable: data });
  } catch (cause) {
    console.error("Creator submission failed:", cause);
    return fail("We couldn't submit your content. Please try again.", 500);
  }
}
