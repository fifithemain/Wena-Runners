import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const token = cookies().get("wena_runner_session")?.value;
  const runnerId = verifySession(token);
  if (!runnerId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .in("status", ["open", "claimed", "bought"])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Strip customer-identifying fields on jobs this runner hasn't claimed.
  const safeJobs = (jobs || []).map((job) => {
    const isMine = job.claimed_by === runnerId;
    if (job.status !== "open" && !isMine) {
      // Someone else is already on this job — don't show it at all.
      return null;
    }
    if (isMine) return job;
    const { customer_phone, delivery_landmark, delivery_lat, delivery_lng, ...rest } = job;
    return rest;
  });

  return NextResponse.json({ jobs: safeJobs.filter(Boolean) });
}
