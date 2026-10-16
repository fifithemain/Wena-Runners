import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getCurrentProfile } from "@/lib/current-profile";

function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured on this deployment. Add SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in Vercel Project Settings → Environment Variables, then redeploy.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    const supabase = db();
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(
        "id,customer_id,runner_id,category,description,pickup_address,dropoff_address,requested_budget,final_budget,service_fee,total_charge,payment_status,status,receipt_required,created_at,flag_reason,collection_pin",
      )
      .in("status", ["posted", "assigned", "in_progress", "disputed", "awaiting_payment", "completed", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (jobsError) return error(jobsError.message, 500);

    // Keep each account type in its own workspace:
    // customers see only their own errands; Runners see public posted work and
    // errands assigned to them; "both" accounts can use both experiences.
    const visibleJobs = (jobs || []).filter((job) => {
      if (!profile) return job.status === "posted";
      if (profile.role === "customer") return job.customer_id === profile.id;
      if (profile.role === "runner") return job.status === "posted" || job.runner_id === profile.id;
      if (profile.role === "both") return job.customer_id === profile.id || job.runner_id === profile.id || job.status === "posted";
      return false;
    });

    const offers: Record<string, any[]> = {};
    if (profile && visibleJobs.length) {
      const customerJobIds = visibleJobs.filter((job) => job.customer_id === profile.id).map((job) => job.id);
      const runnerJobIds = visibleJobs.filter((job) => job.status === "posted" && job.customer_id !== profile.id).map((job) => job.id);
      if (customerJobIds.length) {
        const { data } = await supabase
          .from("job_offers")
          .select("id,job_id,runner_id,offered_amount,note,status,created_at")
          .in("job_id", customerJobIds)
          .eq("status", "pending");
        for (const offer of data || []) (offers[offer.job_id] ||= []).push(offer);
      }
      if (["runner", "both"].includes(profile.role) && runnerJobIds.length) {
        const { data } = await supabase
          .from("job_offers")
          .select("id,job_id,runner_id,offered_amount,note,status,created_at")
          .eq("runner_id", profile.id)
          .eq("status", "pending")
          .in("job_id", runnerJobIds);
        for (const offer of data || []) {
          const bucket = (offers[offer.job_id] ||= []);
          if (!bucket.some((item) => item.id === offer.id)) bucket.push(offer);
        }
      }
    }

    const safeJobs = visibleJobs.map((job) => {
      const isCustomer = profile?.id === job.customer_id;
      const isParticipant = isCustomer || profile?.id === job.runner_id;
      const { collection_pin, ...publicJob } = job;
      return {
        ...publicJob,
        ...(isCustomer ? { collection_pin } : {}),
        ...(!isParticipant
          ? {
              pickup_address: "Shared after assignment",
              dropoff_address: "Shared after assignment",
            }
          : {}),
      };
    });

    return NextResponse.json({ jobs: safeJobs, profile, offers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load errands";
    return error(message, message.startsWith("Supabase is not configured") ? 503 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return error("Sign in to post an errand.", 401);
    if (!["customer", "both"].includes(profile.role)) return error("This account cannot post errands.", 403);

    const form = await request.formData();
    const category = String(form.get("category") || "");
    const description = String(form.get("description") || "").trim().slice(0, 2000);
    const pickup = String(form.get("pickupAddress") || "").trim().slice(0, 500);
    const dropoff = String(form.get("dropoffAddress") || "").trim().slice(0, 500);
    const budget = Number(form.get("requestedBudget"));
    if (
      !["electronics", "clothing", "groceries", "keys_documents", "general_assistance", "other"].includes(
        category,
      ) ||
      !description ||
      !pickup ||
      !dropoff ||
      !Number.isFinite(budget) ||
      budget < 1 ||
      budget > 100000
    ) {
      return error("Complete every field with a valid budget.");
    }

    const receiptRequired = ["electronics", "clothing", "groceries", "keys_documents"].includes(category);
    const file = form.get("receipt");
    if (receiptRequired && !(file instanceof File)) {
      return error("A receipt or proof of payment is required for this category.");
    }

    const supabase = db();
    let receiptPath: string | null = null;
    if (file instanceof File) {
      if (file.size > 8 * 1024 * 1024) return error("Receipt must be under 8 MB.");
      const extension = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
      const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) return error(`Receipt upload failed: ${uploadError.message}`, 500);
      receiptPath = path;
    }

    const { data: job, error: insertError } = await supabase
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
