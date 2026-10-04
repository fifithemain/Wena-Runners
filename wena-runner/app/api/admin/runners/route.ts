import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const supabase = supabaseAdmin();
    const { data: runners, error } = await supabase
      .from("runners")
      .select(
        "id, name, phone, zone, status, completed_jobs, id_number, id_document_path, selfie_path, payout_method, payout_account_name, payout_account_details, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Earned (completed jobs) and paid (payouts) per runner, for a balance column.
    const { data: completed } = await supabase
      .from("jobs")
      .select("claimed_by, shopper_fee")
      .eq("status", "completed");
    const { data: payouts } = await supabase.from("payouts").select("runner_id, amount");

    const earnedMap: Record<string, number> = {};
    (completed || []).forEach((j) => {
      if (!j.claimed_by) return;
      earnedMap[j.claimed_by] = (earnedMap[j.claimed_by] || 0) + j.shopper_fee;
    });
    const paidMap: Record<string, number> = {};
    (payouts || []).forEach((p) => {
      paidMap[p.runner_id] = (paidMap[p.runner_id] || 0) + p.amount;
    });

    const enriched = (runners || []).map((r) => ({
      ...r,
      totalEarned: earnedMap[r.id] || 0,
      totalPaid: paidMap[r.id] || 0,
      balance: (earnedMap[r.id] || 0) - (paidMap[r.id] || 0),
    }));

    return NextResponse.json({ runners: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { runnerId, status } = await req.json();
    if (!runnerId || !["approved", "blocked", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("runners").update({ status }).eq("id", runnerId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
