import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyYocoWebhook } from "@/lib/yoco";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookId = req.headers.get("webhook-id") || "";
    const webhookTimestamp = req.headers.get("webhook-timestamp") || "";
    const signatureHeader = req.headers.get("webhook-signature") || "";

    const valid = verifyYocoWebhook({ webhookId, webhookTimestamp, signatureHeader, rawBody });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const type = event?.type;
    const jobId = event?.payload?.metadata?.jobId;
    const checkoutId = event?.payload?.id || event?.payload?.checkoutId;

    if (!jobId && !checkoutId) {
      return NextResponse.json({ ok: true }); // nothing we can act on, but don't error
    }

    const supabase = supabaseAdmin();

    if (type === "payment.succeeded") {
      const match = jobId ? { id: jobId } : { yoco_checkout_id: checkoutId };
      await supabase
        .from("jobs")
        .update({ status: "open", payment_status: "paid", paid_at: new Date().toISOString() })
        .match(match)
        .eq("payment_status", "pending"); // don't re-open a job that's already moved on
    } else if (type === "payment.failed") {
      const match = jobId ? { id: jobId } : { yoco_checkout_id: checkoutId };
      await supabase.from("jobs").update({ payment_status: "failed" }).match(match);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Webhook error" }, { status: 400 });
  }
}
