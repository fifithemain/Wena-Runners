import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/v3Auth";
import { getJob } from "@/lib/v3JobAccess";
import { jsonError, parseMoney, routeError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await requireProfile(["runner"]);
    if (!auth.profile) return jsonError(auth.error, auth.error === "Forbidden" ? 403 : 401);
    const body = await req.json();
    const amount = parseMoney(body.amount);
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : null;
    if (!amount) return jsonError("Enter a valid counter-offer amount.");

    const job = await getJob(ctx.params.id);
    if (!job) return jsonError("Job not found.", 404);
    if (job.status !== "open" || job.runner_id) return jsonError("This job is no longer available for offers.", 409);
    if (job.customer_id === auth.profile.id) return jsonError("You cannot offer on your own errand.", 403);

    const supabase = supabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("job_offers").select("id,status").eq("job_id", job.id).eq("runner_id", auth.profile.id)
      .in("status", ["pending", "accepted"]).maybeSingle();
    if (findError) throw findError;
    if (existing) return jsonError("You already have an active offer for this errand.", 409);

    const { data, error } = await supabase.from("job_offers").insert({
      job_id: job.id, runner_id: auth.profile.id, customer_id: job.customer_id,
      amount, message, status: "pending",
    }).select("id,job_id,runner_id,amount,message,status,created_at").single();
    if (error) throw error;
    return NextResponse.json({ offer: data }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Request body must be valid JSON.");
    return routeError(error);
  }
}
