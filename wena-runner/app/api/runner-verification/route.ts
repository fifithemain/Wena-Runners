import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getCurrentProfile } from "@/lib/current-profile";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const BUCKET = "runner-verification";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function response(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return response("Sign in with your verified account first.", 401);
    if (!["runner", "both"].includes(profile.role)) return response("Runner verification is only for Runner accounts.", 403);

    const form = await request.formData();
    const documentType = String(form.get("documentType") || "");
    const idNumber = String(form.get("idNumber") || "").trim();
    const file = form.get("file");
    if (!["idDocument", "selfie"].includes(documentType)) return response("Choose an ID photo or selfie to upload.");
    if (!(file instanceof File)) return response("Choose an image to upload.");
    if (documentType === "idDocument" && (idNumber.length < 6 || idNumber.length > 32)) return response("Enter a valid ID number.");
    const label = documentType === "idDocument" ? "ID photo" : "Selfie";
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return response(`${label} must be between 1 byte and 4 MB.`);
    if (!IMAGE_TYPES[file.type]) return response(`${label} must be a JPEG, PNG, or WebP image.`);

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase server configuration is missing.");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("id_document_path,selfie_path")
      .eq("id", profile.id)
      .maybeSingle();
    if (readError || !current) return response("Could not load your Runner profile for verification.", 500);

    const path = `${profile.id}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) return response(`${label} upload failed: ${uploadError.message}`, 500);

    const oldPath = documentType === "idDocument" ? current.id_document_path : current.selfie_path;
    const updates = documentType === "idDocument"
      ? { id_number: idNumber, id_document_path: path }
      : { selfie_path: path };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .in("role", ["runner", "both"]);
    if (updateError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return response(`Could not save Runner verification details: ${updateError.message}`, 500);
    }
    if (oldPath && oldPath !== path) await supabase.storage.from(BUCKET).remove([oldPath]);

    return NextResponse.json({ ok: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not upload Runner verification documents.";
    return response(message, message.startsWith("Supabase server configuration") ? 503 : 500);
  }
}
