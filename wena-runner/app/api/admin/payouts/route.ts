import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { runnerId, amount, note } = await req.json();
    if (!runnerId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing runnerId or a valid amount" }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("payouts").insert({ runner_id: runnerId, amount, note: note || null });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
