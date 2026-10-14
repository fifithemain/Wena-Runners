import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is missing.");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: job } = await supabase
      .from("jobs")
      .select("customer_id,runner_id,receipt_path,receipt_required")
      .eq("id", params.id)
      .maybeSingle();
    if (!job || !job.receipt_path || !job.receipt_required) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }
    if (job.customer_id !== profile.id && job.runner_id !== profile.id) {
      return NextResponse.json({ error: "Not allowed to view this receipt." }, { status: 403 });
    }

    const { data: signed, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(job.receipt_path, 60);
    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not create receipt link." }, { status: 500 });
    }
    return NextResponse.redirect(signed.signedUrl);
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Receipt unavailable." },
      { status: 500 },
    );
  }
}
