import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession, isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const { jobId, action } = await req.json();
  if (!jobId || !action) {
    return NextResponse.json({ error: "Missing jobId or action" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (action === "bought") {
    const token = cookies().get("wena_runner_session")?.value;
    const runnerId = verifySession(token);
    if (!runnerId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("jobs")
      .update({ status: "bought", bought_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("claimed_by", runnerId)
      .eq("status", "claimed")
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Could not update this job" }, { status: 409 });
    }
    return NextResponse.json({ job: data });
  }

  if (action === "completed") {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Could not update this job" }, { status: 409 });
    }
    // Bump the runner's completed_jobs counter.
    if (data.claimed_by) {
      const { data: runner } = await supabase
        .from("runners")
        .select("completed_jobs")
        .eq("id", data.claimed_by)
        .single();
      if (runner) {
        await supabase
          .from("runners")
          .update({ completed_jobs: (runner.completed_jobs || 0) + 1 })
          .eq("id", data.claimed_by);
      }
    }
    return NextResponse.json({ job: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
