import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured on this deployment. Add SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in Vercel Project Settings → Environment Variables, then redeploy."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function who() {
  const token = cookies().get("wena_runner_session")?.value;
  if (!token) return null;

  const client = db();
  const { data, error: authError } = await client.auth.getUser(token);
  if (authError || !data.user) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("id,full_name,email,zone,role,is_verified")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile;
}

export async function GET() {
  try {
    const profile = await who().catch(() => null);
    const client = db();
    const { data: jobs, error: jobsError } = await client
      .from("jobs")
      .select("id,customer_id,runner_id,category,description,pickup_address,dropoff_address,requested_budget,final_budget,status,receipt_required,created_at,flag_reason")
      .in("status", ["posted", "assigned", "in_progress", "disputed", "awaiting_payment"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (jobsError) return error(jobsError.message, 500);

    const offers: Record<string, any[]> = {};
    if (profile && jobs?.length) {
      const ids = jobs.filter((job) => job.customer_id === profile.id).map((job) => job.id);
      if (ids.length) {
        const { data } = await client
          .from("job_offers")
          .select("id,job_id,runner_id,offered_amount,note,status,created_at")
          .in("job_id", ids);

        for (const offer of data || []) (offers[offer.job_id] ||= []).push(offer);
      }
    }

    const safeJobs = (jobs || []).map((job) =>
      profile && (job.customer_id === profile.id || job.runner_id === profile.id)
        ? job
        : { ...job, pickup_address: "Shared after assignment", dropoff_address: "Shared after assignment" }
    );

    return NextResponse.json({ jobs: safeJobs, profile, offers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load errands";
    return error(message, message.startsWith("Supabase is not configured") ? 503 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const profile = await who();
    if (!profile) return error("Sign in to post an errand.", 401);
    if (!["customer", "both"].includes(profile.role)) {
      return error("This account cannot post errands.", 403);
    }

    const form = await request.formData();
    const category = String(form.get("category") || "");
    const description = String(form.get("description") || "").trim().slice(0, 2000);
    const pickup = String(form.get("pickupAddress") || "").trim().slice(0, 500);
    const dropoff = String(form.get("dropoffAddress") || "").trim().slice(0, 500);
    const budget = Number(form.get("requestedBudget"));

    if (
      !["electronics", "clothing", "groceries", "keys_documents", "general_assistance", "other"].includes(category) ||
      !description || !pickup || !dropoff || !Number.isFinite(budget) || budget < 1 || budget > 100000
    ) {
      return error("Complete every field with a valid budget.");
    }

    const receiptRequired = ["electronics", "clothing", "groceries", "keys_documents"].includes(category);
    const file = form.get("receipt");
    if (receiptRequired && !(file instanceof File)) {
      return error("A receipt or proof of payment is required for this category.");
    }

    const client = db();
    let receiptPath: string | null = null;

    if (file instanceof File) {
      if (file.size > 8 * 1024 * 1024) return error("Receipt must be under 8 MB.");
      const extension = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
      const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("receipts")
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) return error("Receipt upload failed: " + uploadError.message, 500);
      receiptPath = path;
    }

    const { data: job, error: insertError } = await client
      .from("jobs")
      .insert({
        customer_id: profile.id,
        category,
        description,
        pickup_address: pickup,
        dropoff_address: dropoff,
        requested_budget: Math.round(budget),
        receipt_required: receiptRequired,
        receipt_path: receiptPath,
        status: "posted",
        payment_status: "pending",
        collection_pin: String(crypto.randomInt(100000, 999999)),
      })
      .select("id,collection_pin")
      .single();

    if (insertError) return error(insertError.message, 500);
    return NextResponse.json({ jobId: job.id, collectionPin: job.collection_pin });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not post errand";
    return error(message, message.startsWith("Supabase is not configured") ? 503 : 500);
  }
}
