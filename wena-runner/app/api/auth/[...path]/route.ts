import { NextResponse } from "next/server";

function retired() {
  return NextResponse.json(
    { error: "Supabase password sign-in has been replaced by Clerk. Use the app's sign-in page." },
    { status: 410 },
  );
}

export const GET = retired;
export const POST = retired;
