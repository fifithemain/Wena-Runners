import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/v3Auth";
import { getJob, isJobParticipant } from "@/lib/v3JobAccess";
import { jsonError, routeError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await requireProfile(["customer", "runner"]);
    if (!auth.profile) return jsonError(auth.error, auth.error === "Forbidden" ? 403 : 401);
    const job = await getJob(ctx.params.id);
    if (!job) return jsonError("Job not found.", 404);
    if (!isJobParticipant(job, auth.profile.id)) return jsonError("You cannot view offers for this errand.", 403);

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from("job_offers")
      .select("id,job_id,runner_id,customer_id,amount,message,status,created_at,updated_at")
      .eq("job_id", job.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ offers: data ?? [] });
  } catch (error) {
    return routeError(error);
  }
}
