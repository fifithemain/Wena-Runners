import { NextResponse } from "next/server";

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function parseMoney(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return null;
  return Math.round(amount * 100) / 100;
}

export function routeError(error: unknown) {
  console.error("WENA API route error:", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
