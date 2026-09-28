import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { name, phone, zone, pin } = await req.json();

  if (!name || !phone || !zone || !pin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN should be 4 to 6 digits" }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const supabase = supabaseAdmin();

  const { error } = await supabase.from("runners").insert({
    name,
    phone,
    zone,
    pin_hash: pinHash,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That phone number is already registered" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
