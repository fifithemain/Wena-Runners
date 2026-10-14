import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is missing.");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const [{ data: jobs }, { data: payouts }] = await Promise.all([
      supabase.from("jobs").select("final_budget,requested_budget").eq("runner_id", profile.id).eq("status", "completed"),
      supabase
        .from("payouts")
        .select("id,amount,note,paid_at")
        .eq("runner_id", profile.id)
        .order("paid_at", { ascending: false }),
    ]);
    const earned = (jobs || []).reduce(
      (sum, job) => sum + Number(job.final_budget || job.requested_budget || 0),
      0,
    );
    const paid = (payouts || []).reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
    return NextResponse.json({
      totalEarned: earned,
      totalPaid: paid,
      balance: earned - paid,
      payouts: payouts || [],
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Could not load earnings." },
      { status: 500 },
    );
  }
}
