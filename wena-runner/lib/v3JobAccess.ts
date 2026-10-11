import { supabaseAdmin } from "@/lib/supabase";

export async function getJob(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export function isJobParticipant(job: any, profileId: string) {
  return job?.customer_id === profileId || job?.runner_id === profileId;
}
