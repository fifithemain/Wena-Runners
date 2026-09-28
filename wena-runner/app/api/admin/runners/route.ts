import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("runners")
    .select("id, name, phone, zone, status, completed_jobs, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ runners: data });
}

export async function PATCH(req: Request) {
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
}
