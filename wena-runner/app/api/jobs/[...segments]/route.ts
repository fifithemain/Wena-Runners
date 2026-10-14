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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function checkout(total: number, jobId: string, email: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (!process.env.PAYSTACK_SECRET_KEY || !site) {
    throw new Error("Paystack is not configured. Contact WENA support.");
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: String(Math.round(total * 100)),
      currency: "ZAR",
      callback_url: `${site}/jobs?payment=return&job=${jobId}`,
      metadata: {
        jobId,
        custom_fields: [{ display_name: "WENA errand", variable_name: "job_id", value: jobId }],
      },
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(result.message || "Paystack checkout could not be initialized.");
  }
  return { id: result.data.reference, redirectUrl: result.data.authorization_url };
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

      const { data: job } = await supabase
        .from("jobs")
        .select("id,customer_id,status")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || job.status !== "posted") return error("Errand is no longer open.", 409);
      if (job.customer_id === profile.id) return error("You cannot offer on your own errand.");

      const { data: oldOffer } = await supabase
        .from("job_offers")
        .select("id")
        .eq("job_id", job.id)
        .eq("runner_id", profile.id)
        .eq("status", "pending")
        .maybeSingle();
      const result = oldOffer
        ? await supabase
            .from("job_offers")
            .update({ offered_amount: offerAmount, note: text(body.note, 500) || null })
            .eq("id", oldOffer.id)
        : await supabase.from("job_offers").insert({
            job_id: job.id,
            runner_id: profile.id,
            offered_amount: offerAmount,
            note: text(body.note, 500) || null,
            status: "pending",
          });
      if (result.error) return error(result.error.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "accept") {
      const { data: job } = await supabase
        .from("jobs")
        .select("id,customer_id,status")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || job.customer_id !== profile.id || job.status !== "posted") {
        return error("Errand is not available to accept.", 409);
      }

      const { data: offer } = await supabase
        .from("job_offers")
        .select("id,runner_id,offered_amount,status")
        .eq("id", body.offerId)
        .eq("job_id", job.id)
        .eq("status", "pending")
        .maybeSingle();
      if (!offer) return error("Offer unavailable.", 409);

      const { data: runner } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", offer.runner_id)
        .single();
      if (!runner?.is_verified) return error("Runner is not verified.", 403);

      const fee = Math.max(10, Math.round(offer.offered_amount * 0.1));
      const total = offer.offered_amount + fee;
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          runner_id: offer.runner_id,
          final_budget: offer.offered_amount,
          service_fee: fee,
          total_charge: total,
          status: "awaiting_payment",
        })
        .eq("id", job.id)
        .eq("status", "posted");
      if (updateError) return error(updateError.message, 500);

      await supabase.from("job_offers").update({ status: "declined" }).eq("job_id", job.id).neq("id", offer.id);
      await supabase.from("job_offers").update({ status: "accepted" }).eq("id", offer.id);

      if (process.env.YOCO_SECRET_KEY) {
        const payment = await checkout(total, job.id, profile.email);
        await supabase.from("jobs").update({ paystack_reference: payment.id }).eq("id", job.id);
        return NextResponse.json({ checkoutUrl: payment.redirectUrl });
      }
      return NextResponse.json({ ok: true, notice: "Configure Yoco to collect payment before work starts." });
    }

    if (action === "complete") {
      const { data: job } = await supabase
        .from("jobs")
        .select("runner_id,collection_pin,status,payment_status")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || job.runner_id !== profile.id || !["assigned", "in_progress"].includes(job.status)) {
        return error("Errand is not assigned to you.", 403);
      }
      if (!job.collection_pin || text(body.pin, 12) !== job.collection_pin) {
        return error("Hand-off PIN is incorrect.");
      }
      if (process.env.PAYSTACK_SECRET_KEY && job.payment_status !== "paid") {
        return error("Payment is not confirmed yet.", 409);
      }

      const { error: updateError } = await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString(), collection_pin: "" })
        .eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "flag") {
      const { data: job } = await supabase
        .from("jobs")
        .select("runner_id,status")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || job.runner_id !== profile.id) return error("Errand not assigned to you.", 403);

      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "disputed",
          is_flagged: true,
          flag_reason: text(body.reason, 500) || "Runner reported issue",
        })
        .eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      const { data: job } = await supabase
        .from("jobs")
        .select("customer_id,status")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || job.customer_id !== profile.id || !["posted", "awaiting_payment"].includes(job.status)) {
        return error("Errand cannot be cancelled.", 409);
      }

      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "cancelled",
          cancel_reason: "Cancelled by customer",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (updateError) return error(updateError.message, 500);
      return NextResponse.json({ ok: true });
    }

    return error("Not found.", 404);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Request failed", 500);
  }
}
