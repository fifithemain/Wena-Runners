import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

// A Runner flags a job when the slip looks wrong / the store rejects it.
export async function POST(req: Request) {
  try {
    const token = cookies().get("wena_runner_session")?.value;
    const runnerId = verifySession(token);
    if (!runnerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const { jobId, reason } = await req.json();
    if (!jobId || !reason) {
      return NextResponse.json({ error: "Please give a reason" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("jobs")
      .update({ status: "disputed", is_flagged: true, flag_reason: reason })
      .eq("id", jobId)
      .eq("claimed_by", runnerId)
      .eq("status", "claimed")
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not flag this job" }, { status: 409 });
    }
    return NextResponse.json({ job: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
