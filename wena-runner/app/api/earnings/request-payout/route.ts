import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Sign in with a verified email first." }, { status: 401 });
    }
    if (!["runner", "both"].includes(profile.role)) {
      return NextResponse.json({ error: "Payouts are available to Runner accounts only." }, { status: 403 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const method = typeof body.method === "string" ? body.method : "";
    const accountDetails = typeof body.accountDetails === "string" ? body.accountDetails.trim() : "";
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000 || !["bank_transfer", "mobile_money"].includes(method) || accountDetails.length < 3 || accountDetails.length > 500) {
      return NextResponse.json({ error: "Enter a valid amount, payout method, and payment details." }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is missing.");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("request_runner_payout", {
      p_runner_id: profile.id,
      p_amount: Math.round(amount * 100) / 100,
      p_method: method,
      p_account_details: accountDetails,
    });
    if (error) {
      const message = error.message || "Could not submit payout request.";
      const status = /available balance|valid payout|choose a valid|runner accounts|profile not found/i.test(message) ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
    const requestRow = Array.isArray(data) ? data[0] : data;
    if (!requestRow?.request_id) throw new Error("Payout request was not confirmed by the database.");
    return NextResponse.json({ ok: true, request: requestRow });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Could not submit payout request." },
      { status: 500 },
    );
  }
}
