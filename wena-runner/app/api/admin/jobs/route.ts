import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, runners:claimed_by (name, phone)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data });
}
