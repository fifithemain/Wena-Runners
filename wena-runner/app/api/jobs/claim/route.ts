import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export async function POST(req: Request) {
  const token = cookies().get("wena_runner_session")?.value;
  const runnerId = verifySession(token);
  if (!runnerId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Conditional update: only succeeds if the job is still 'open'.
  // This is what stops two Runners claiming the same job at once.
  const { data, error } = await supabase
    .from("jobs")
    .update({
      status: "claimed",
      claimed_by: runnerId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "open")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "This job was just claimed by someone else" },
      { status: 409 }
    );
  }

  return NextResponse.json({ job: data });
}
