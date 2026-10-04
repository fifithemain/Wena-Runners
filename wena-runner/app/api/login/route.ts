import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { signSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();
    if (!phone || !pin) {
      return NextResponse.json({ error: "Missing phone or PIN" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data: runner, error } = await supabase
      .from("runners")
      .select("id, pin_hash, status")
      .eq("phone", phone)
      .single();

    if (error || !runner) {
      return NextResponse.json({ error: "No account with that number" }, { status: 404 });
    }

    const valid = await bcrypt.compare(pin, runner.pin_hash);
    if (!valid) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }

    if (runner.status !== "approved") {
      return NextResponse.json({ error: "Your account is still pending approval" }, { status: 403 });
    }

    const token = signSession(runner.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("wena_runner_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong. Please try again." }, { status: 500 });
  }
}
