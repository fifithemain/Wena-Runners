import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("jobs")
      .select("store_name, shopper_fee")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) return NextResponse.json({ jobs: [] });
    return NextResponse.json({ jobs: data || [] });
  } catch {
    return NextResponse.json({ jobs: [] });
  }
}
