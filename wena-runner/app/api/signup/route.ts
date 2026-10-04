import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

async function uploadTo(supabase: ReturnType<typeof supabaseAdmin>, bucket: string, phone: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${phone.replace(/\D/g, "")}-${Date.now()}-${bucket}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`Could not upload to ${bucket}: ${error.message}`);
  return path;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const zone = String(form.get("zone") || "").trim();
    const pin = String(form.get("pin") || "").trim();
    const idNumber = String(form.get("idNumber") || "").trim();
    const idDoc = form.get("idDocument") as File | null;
    const selfie = form.get("selfie") as File | null;

    if (!name || !phone || !zone || !pin || !idNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN should be 4 to 6 digits" }, { status: 400 });
    }
    if (!idDoc || idDoc.size === 0) {
      return NextResponse.json({ error: "Please upload a photo of your ID document" }, { status: 400 });
    }
    if (!selfie || selfie.size === 0) {
      return NextResponse.json({ error: "Please upload a selfie for verification" }, { status: 400 });
    }
    if (idDoc.size > 8 * 1024 * 1024 || selfie.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Files are too large (max 8MB each)" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const pinHash = await bcrypt.hash(pin, 10);

    const idPath = await uploadTo(supabase, "id-documents", phone, idDoc);
    const selfiePath = await uploadTo(supabase, "id-documents", phone, selfie);

    const { error } = await supabase.from("runners").insert({
      name,
      phone,
      zone,
      pin_hash: pinHash,
      status: "pending",
      id_number: idNumber,
      id_document_path: idPath,
      selfie_path: selfiePath,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That phone number is already registered" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong. Please try again." }, { status: 500 });
  }
}
