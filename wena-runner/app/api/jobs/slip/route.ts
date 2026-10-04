import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession, isAdmin } from "@/lib/auth";

// Signed URL to the customer's proof-of-payment slip. Only the Runner who
// claimed the job (or an admin) can ever see it.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const supabase = supabaseAdmin();
    const { data: job, error } = await supabase
      .from("jobs")
      .select("slip_path, claimed_by")
      .eq("id", jobId)
      .single();
    if (error || !job?.slip_path) {
      return NextResponse.json({ error: "No slip on file" }, { status: 404 });
    }

    if (!isAdmin(req)) {
      const token = cookies().get("wena_runner_session")?.value;
      const runnerId = verifySession(token);
      if (!runnerId || job.claimed_by !== runnerId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("store-slips")
      .createSignedUrl(job.slip_path, 60 * 5);
    if (signErr || !signed) {
      return NextResponse.json({ error: "Could not open the slip" }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
