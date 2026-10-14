import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both the legacy service-role JWT and the newer Supabase secret key.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in the Vercel Production environment, then redeploy.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (!["runner", "both"].includes(profile.role)) {
      return NextResponse.json({ error: "The wallet is available to Runner accounts only." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const [
      { data: jobs, error: jobsError },
      { data: payouts, error: payoutsError },
      { data: requests, error: requestsError },
    ] = await Promise.all([
      supabase.from("jobs").select("final_budget,requested_budget").eq("runner_id", profile.id).eq("status", "completed"),
      supabase.from("payouts").select("id,amount,note,paid_at").eq("runner_id", profile.id).order("paid_at", { ascending: false }),
      supabase.from("payout_requests").select("id,amount,method,status,admin_note,created_at,processed_at").eq("runner_id", profile.id).order("created_at", { ascending: false }),
    ]);
    if (jobsError || payoutsError || requestsError) {
      throw new Error(jobsError?.message || payoutsError?.message || requestsError?.message || "Could not load wallet data.");
    }

    const earned = (jobs || []).reduce((sum, job) => sum + Number(job.final_budget ?? job.requested_budget ?? 0), 0);
    const paid = (payouts || []).reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
    const pendingPayouts = (requests || [])
      .filter((request) => ["pending", "processing"].includes(String(request.status).toLowerCase()))
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);

    return NextResponse.json({
      totalEarned: earned,
      totalPaid: paid,
      balance: Math.max(0, earned - paid),
      pendingPayouts,
      availableBalance: Math.max(0, earned - paid - pendingPayouts),
      payouts: payouts || [],
      requests: requests || [],
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Could not load earnings." },
      { status: 500 },
    );
  }
}
