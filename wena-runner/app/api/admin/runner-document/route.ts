import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

// Returns a short-lived signed URL so the admin can view a Runner's ID
// document without the storage bucket ever being public.
export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const runnerId = searchParams.get("runnerId");
    const type = searchParams.get("type") === "selfie" ? "selfie_path" : "id_document_path";
    if (!runnerId) {
      return NextResponse.json({ error: "Missing runnerId" }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data: runner, error } = await supabase
      .from("runners")
      .select("id_document_path, selfie_path")
      .eq("id", runnerId)
      .single();
    const path = runner ? (runner as any)[type] : null;
    if (error || !path) {
      return NextResponse.json({ error: "No document on file" }, { status: 404 });
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from("id-documents")
      .createSignedUrl(path, 60 * 5);
    if (signErr || !signed) {
      return NextResponse.json({ error: "Could not create a link to the document" }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
