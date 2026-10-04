import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession, isAdmin } from "@/lib/auth";

async function creditRunner(supabase: ReturnType<typeof supabaseAdmin>, runnerId: string) {
  const { data: runner } = await supabase.from("runners").select("completed_jobs").eq("id", runnerId).single();
  if (runner) {
    await supabase.from("runners").update({ completed_jobs: (runner.completed_jobs || 0) + 1 }).eq("id", runnerId);
  }
}

export async function POST(req: Request) {
  try {
    const { jobId, action, pin } = await req.json();
    if (!jobId || !action) {
      return NextResponse.json({ error: "Missing jobId or action" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Runner self-completes a job by entering the hand-off PIN the customer
    // gives them once the order has actually been received.
    if (action === "complete") {
      const token = cookies().get("wena_runner_session")?.value;
      const runnerId = verifySession(token);
      if (!runnerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
      if (!pin) return NextResponse.json({ error: "Enter the hand-off PIN" }, { status: 400 });

      const { data: job, error: fetchErr } = await supabase
        .from("jobs")
        .select("id, collection_pin, claimed_by, status")
        .eq("id", jobId)
        .single();
      if (fetchErr || !job || job.claimed_by !== runnerId || job.status !== "claimed") {
        return NextResponse.json({ error: "This job can't be completed right now" }, { status: 409 });
      }
      if (String(pin).trim() !== job.collection_pin) {
        return NextResponse.json({ error: "Wrong PIN — check with the customer" }, { status: 401 });
      }

      const { data, error } = await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .select()
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "Could not complete this job" }, { status: 409 });
      }
      await creditRunner(supabase, runnerId);
      return NextResponse.json({ job: data });
    }

    // Admin overrides (fallback if a Runner genuinely can't get the PIN,
    // or resolving a disputed/flagged job).
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (action === "completed") {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .select()
        .single();
      if (error || !data) return NextResponse.json({ error: "Could not update this job" }, { status: 409 });
      if (data.claimed_by) await creditRunner(supabase, data.claimed_by);
      return NextResponse.json({ job: data });
    }

    if (action === "reopen") {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: "open", claimed_by: null, claimed_at: null, is_flagged: false, flag_reason: null })
        .eq("id", jobId)
        .select()
        .single();
      if (error || !data) return NextResponse.json({ error: "Could not reopen this job" }, { status: 409 });
      return NextResponse.json({ job: data });
    }

    if (action === "cancel") {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: "cancelled" })
        .eq("id", jobId)
        .select()
        .single();
      if (error || !data) return NextResponse.json({ error: "Could not cancel this job" }, { status: 409 });
      return NextResponse.json({ job: data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
