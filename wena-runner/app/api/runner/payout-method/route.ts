import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = cookies().get("wena_runner_session")?.value;
    const runnerId = verifySession(token);
    if (!runnerId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const { payoutMethod, payoutAccountName, payoutAccountDetails } = await req.json();
    if (!payoutMethod || !payoutAccountName || !payoutAccountDetails) {
      return NextResponse.json({ error: "Please fill in all payout fields" }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { error } = await supabase
      .from("runners")
      .update({
        payout_method: payoutMethod,
        payout_account_name: payoutAccountName,
        payout_account_details: payoutAccountDetails,
      })
      .eq("id", runnerId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
