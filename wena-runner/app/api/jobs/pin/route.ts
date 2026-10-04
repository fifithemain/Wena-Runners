import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Only reveals the hand-off PIN once payment is confirmed — used by the
// /pay/success page after a customer returns from Yoco.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const supabase = supabaseAdmin();
    const { data: job, error } = await supabase
      .from("jobs")
      .select("collection_pin, payment_status")
      .eq("id", jobId)
      .single();

    if (error || !job || job.payment_status !== "paid") {
      return NextResponse.json({ error: "Not available yet" }, { status: 404 });
    }
    return NextResponse.json({ collectionPin: job.collection_pin });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
