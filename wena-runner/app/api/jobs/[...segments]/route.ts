import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const text = (value: unknown, limit = 2000) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const amount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= 100000 ? Math.round(number) : null;
};

function database() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function createYocoCheckout(total: number, jobId: string, customerId: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://wena-runners.vercel.app").replace(/\/$/, "");
  const secret = process.env.YOCO_SECRET_KEY;
  if (!secret) throw new Error("Yoco is not configured. Add YOCO_SECRET_KEY to Vercel Production and redeploy.");

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `wena-job-${jobId}`,
    },
    body: JSON.stringify({
      amount: Math.round(total * 100),
      currency: "ZAR",
      successRedirectUrl: `${site}/payment?status=success&job=${encodeURIComponent(jobId)}`,
      failureRedirectUrl: `${site}/payment?status=failed&job=${encodeURIComponent(jobId)}`,
      cancelRedirectUrl: `${site}/payment?status=cancelled&job=${encodeURIComponent(jobId)}`,
      description: `WENA Runners errand ${jobId}`,
      metadata: { jobId, customerId, purpose: "errand_payment" },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id || !result.redirectUrl) {
    throw new Error(result.message || "Yoco checkout could not be initialized.");
  }
  return { id: String(result.id), redirectUrl: String(result.redirectUrl) };
}

export async function POST(
  request: Request,
  { params }: { params: { segments: string[] } },
) {
  try {
    const [jobId, action] = params.segments;
    if (!jobId || !action || params.segments.length !== 2) return error("Not found.", 404);

    const profile = await getCurrentProfile();
    if (!profile) return error("Sign in first.", 401);

    const supabase = database();
    const body = await request.json();

    if (action === "offer") {
      if (!["runner", "both"].includes(profile.role) || !profile.is_verified) {
        return error("Only verified Runners can make offers.", 403);
      }
      const offerAmount = amount(body.amount);
      if (!offerAmount) return error("Enter a valid offer amount.");
      const { data: job } = await supabase.from("jobs").select("id,customer_id,status").eq("id", jobId).maybeSingle();
      if (!job || job.status !== "posted") return error("Errand is no longer open.", 409);
      if (job.customer_id === profile.id) return error("You cannot offer on your own errand.");
      const { data: oldOffer } = await supabase.from("job_offers").select("id").eq("job_id", job.id).eq("runner_id", profile.id).eq("status", "pending").maybeSingle();
      const result = oldOffer
        ? await supabase.from("job_offers").update({ offered_amount: offerAmount, note: text(body.note, 500) || null }).eq("id", oldOffer.id)
        : await supabase.from("job_offers").insert({ job_id: job.id, runner_id: profile.id, offered_amount: offerAmount, note: text(body.note, 500) || null, status: "pending" });
      if (result.error) return error(result.error.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "counter") {
      if (!["customer", "both"].includes(profile.role)) return error("Only the customer can counter an offer.", 403);
      const counterAmount = amount(body.amount);
      if (!counterAmount) return error("Enter a valid counteroffer amount.");
      const { data: job } = await supabase.from("jobs").select("id,customer_id,status").eq("id", jobId).maybeSingle();
      if (!job || job.customer_id !== profile.id || job.status !== "posted") return error("Only the owner of an open errand can counter an offer.", 403);
      const { data: offer } = await supabase.from("job_offers").select("id,note,status").eq("id", body.offerId).eq("job_id", job.id).eq("status", "pending").maybeSingle();
      if (!offer) return error("Offer is no longer available to counter.", 409);
      const note = [text(offer.note, 300), `Customer counteroffer: R${counterAmount}`].filter(Boolean).join(" | ").slice(0, 500);
      const { error: counterError } = await supabase.from("job_offers").update({ offered_amount: counterAmount, note }).eq("id", offer.id).eq("status", "pending");
      if (counterError) return error(counterError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "accept") {
      const { data: job } = await supabase.from("jobs").select("id,customer_id,status").eq("id", jobId).maybeSingle();
      if (!job || job.customer_id !== profile.id || job.status !== "posted") return error("Errand is not available to accept.", 409);
      const { data: offer } = await supabase.from("job_offers").select("id,runner_id,offered_amount,status").eq("id", body.offerId).eq("job_id", job.id).eq("status", "pending").maybeSingle();
      if (!offer) return error("Offer unavailable.", 409);
      const { data: runner } = await supabase.from("profiles").select("is_verified").eq("id", offer.runner_id).single();
      if (!runner?.is_verified) return error("Runner is not verified.", 403);

      const fee = Math.max(10, Math.round(offer.offered_amount * 0.1));
      const total = Number(offer.offered_amount) + fee;
      const { data: updatedJobs, error: updateError } = await supabase.from("jobs")
        .update({ runner_id: offer.runner_id, final_budget: offer.offered_amount, service_fee: fee, total_charge: total, status: "awaiting_payment", payment_status: "pending" })
        .eq("id", job.id).eq("status", "posted").select("id");
      if (updateError) return error(updateError.message, 500);
      if (!updatedJobs?.length) return error("This errand has already been accepted. Refresh and try again.", 409);

      await supabase.from("job_offers").update({ status: "declined" }).eq("job_id", job.id).neq("id", offer.id);
      await supabase.from("job_offers").update({ status: "accepted" }).eq("id", offer.id);

      const payment = await createYocoCheckout(total, job.id, profile.id);
      // Keep the existing reference field so no schema change is required.
      const { error: referenceError } = await supabase.from("jobs").update({ paystack_reference: payment.id }).eq("id", job.id);
      if (referenceError) return error("Checkout was created but could not be saved. Contact WENA support before retrying.", 500);
      return NextResponse.json({ checkoutUrl: payment.redirectUrl });
    }


    if (action === "pay") {
      const { data: job } = await supabase.from("jobs").select("id,customer_id,final_budget,requested_budget,service_fee,total_charge,status,payment_status,paystack_reference").eq("id", jobId).maybeSingle();
      if (!job || job.customer_id !== profile.id) return error("Only the customer who posted this errand can pay.", 403);
      if (job.status !== "awaiting_payment") return error("This errand is not awaiting payment.", 409);
      if (job.payment_status === "paid") return error("Payment is already confirmed.");
      const total = Number(job.total_charge || (Number(job.final_budget ?? job.requested_budget) + Number(job.service_fee || 0)));
      const payment = await createYocoCheckout(total, job.id, profile.id);
      const { error: referenceError } = await supabase.from("jobs").update({ paystack_reference: payment.id }).eq("id", job.id).eq("status", "awaiting_payment");
      if (referenceError) return error("Checkout was created but could not be saved. Contact WENA support before retrying.", 500);
      return NextResponse.json({ checkoutUrl: payment.redirectUrl, amount: total });
    }

    if (action === "verify") {
      const { data: job, error: jobError } = await supabase.from("jobs").select("id,customer_id,status,payment_status,total_charge,paystack_reference").eq("id", jobId).maybeSingle();
      if (jobError) return error(jobError.message, 500);
      if (!job || job.customer_id !== profile.id) return error("Errand not found for this account.", 404);
      if (job.payment_status === "paid") return NextResponse.json({ status: "paid" });
      if (!job.paystack_reference) return NextResponse.json({ status: "pending" });
      const yocoKey = process.env.YOCO_SECRET_KEY;
      if (!yocoKey) return error("Yoco server key is missing from this deployment.", 503);
      const response = await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(job.paystack_reference)}`, { headers: { Authorization: `Bearer ${yocoKey}`, Accept: "application/json" }, cache: "no-store" });
      const checkoutResult = await response.json().catch(() => ({}));
      if (!response.ok) return error("Yoco has not returned a verifiable checkout status yet. Retry shortly.", 502);
      if (String(checkoutResult.status || "").toLowerCase() !== "completed") return NextResponse.json({ status: String(checkoutResult.status || "pending").toLowerCase() });
      if (Number(checkoutResult.amount) !== Math.round(Number(job.total_charge || 0) * 100) || String(checkoutResult.currency || "ZAR").toUpperCase() !== "ZAR") return error("Verified checkout amount does not match this errand. Contact WENA support.", 409);
      const { error: updateError } = await supabase.from("jobs").update({ payment_status: "paid", status: "assigned" }).eq("id", job.id).eq("customer_id", profile.id).eq("payment_status", "pending");
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ status: "paid" });
    }

    if (action === "complete") {
      const { data: job } = await supabase.from("jobs").select("runner_id,collection_pin,status,payment_status").eq("id", jobId).maybeSingle();
      if (!job || job.runner_id !== profile.id || !["assigned", "in_progress"].includes(job.status)) return error("Errand is not assigned to you.", 403);
      if (!job.collection_pin || text(body.pin, 12) !== job.collection_pin) return error("Hand-off PIN is incorrect.");
      if (job.payment_status !== "paid") return error("Payment is not confirmed yet.", 409);
      const { error: updateError } = await supabase.from("jobs").update({ status: "completed", completed_at: new Date().toISOString(), collection_pin: "" }).eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "flag") {
      const { data: job } = await supabase.from("jobs").select("runner_id,status").eq("id", jobId).maybeSingle();
      if (!job || job.runner_id !== profile.id) return error("Errand not assigned to you.", 403);
      const { error: updateError } = await supabase.from("jobs").update({ status: "disputed", is_flagged: true, flag_reason: text(body.reason, 500) || "Runner reported issue" }).eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      const { data: job } = await supabase.from("jobs").select("customer_id,status").eq("id", jobId).maybeSingle();
      if (!job || job.customer_id !== profile.id || !["posted", "awaiting_payment"].includes(job.status)) return error("Errand cannot be cancelled.", 409);
      const { error: updateError } = await supabase.from("jobs").update({ status: "cancelled", cancel_reason: "Cancelled by customer", cancelled_at: new Date().toISOString() }).eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    return error("Not found.", 404);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Request failed", 500);
  }
}
