import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/current-profile";

const db = () =>
  createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } },
  );
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in first.", 401);

    const supabase = db();
    const { data: job } = await supabase
      .from("jobs")
      .select("customer_id,runner_id,status")
      .eq("id", params.id)
      .maybeSingle();
    if (!job || ![job.customer_id, job.runner_id].includes(profile.id) || !job.runner_id) {
      return fail("Chat is only available to errand participants after a Runner is assigned.", 403);
    }

    const { data: messages, error } = await supabase
      .from("job_messages")
      .select("id,job_id,sender_id,content,created_at")
      .eq("job_id", params.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return fail(error.message, 500);
    return NextResponse.json({
      messages: (messages || []).map((message) => ({ ...message, current_user_id: profile.id })),
    });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Chat unavailable", 500);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return fail("Sign in first.", 401);

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
    if (!content) return fail("Write a message first.");

    const supabase = db();
    const { data: job } = await supabase
      .from("jobs")
      .select("customer_id,runner_id,status")
      .eq("id", params.id)
      .maybeSingle();
    if (!job || ![job.customer_id, job.runner_id].includes(profile.id) || !job.runner_id) {
      return fail("Chat is only available to errand participants after a Runner is assigned.", 403);
    }

    const { data, error } = await supabase
      .from("job_messages")
      .insert({ job_id: params.id, sender_id: profile.id, content })
      .select("id")
      .single();
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Message failed", 500);
  }
}
