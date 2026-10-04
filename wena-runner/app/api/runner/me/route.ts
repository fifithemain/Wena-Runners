import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    const token = cookies().get("wena_runner_session")?.value;
    const runnerId = verifySession(token);
    if (!runnerId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const supabase = supabaseAdmin();

    const { data: runner, error: runnerErr } = await supabase
      .from("runners")
      .select("id, name, phone, zone, status, completed_jobs, payout_method, payout_account_name, payout_account_details")
      .eq("id", runnerId)
      .single();
    if (runnerErr || !runner) {
      return NextResponse.json({ error: "Runner not found" }, { status: 404 });
    }

    const { data: completedJobs } = await supabase
      .from("jobs")
      .select("id, store_name, shopper_fee, completed_at")
      .eq("claimed_by", runnerId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    const { data: payouts } = await supabase
      .from("payouts")
      .select("id, amount, note, paid_at")
      .eq("runner_id", runnerId)
      .order("paid_at", { ascending: false });

    const totalEarned = (completedJobs || []).reduce((sum, j) => sum + j.shopper_fee, 0);
    const totalPaid = (payouts || []).reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      runner,
      completedJobs: completedJobs || [],
      payouts: payouts || [],
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
