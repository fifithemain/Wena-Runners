import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(request: Request) {
  const proxyUrl = (process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "").replace(/\/$/, "");
  const frontendApiUrl = (process.env.CLERK_FAPI_URL || "https://frontend-api.clerk.services").replace(/\/$/, "");
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!proxyUrl || !frontendApiUrl || !secretKey) {
    return NextResponse.json({ error: "Clerk proxy is not configured." }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/__clerk(?=\/|$)/, "") || "/";
  const upstreamUrl = new URL(`${path}${incoming.search}`, frontendApiUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.set("Clerk-Proxy-Url", proxyUrl);
  headers.set("Clerk-Secret-Key", secretKey);

  const clientIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (cause) {
    const networkCause = cause as { cause?: { code?: string; message?: string } };
    const detail = cause instanceof Error
      ? `${cause.message}${networkCause.cause?.code ? ` (${networkCause.cause.code})` : ""}${networkCause.cause?.message ? `: ${networkCause.cause.message}` : ""}`
      : "Unknown network error.";
    return NextResponse.json(
      { error: "Clerk proxy could not reach its upstream.", detail },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  const location = responseHeaders.get("location");
  if (location) {
    const rewritten = location
      .replace(/^https?:\/\/clerk\.wena-runners\.vercel\.app/i, proxyUrl)
      .replace(/^https?:\/\/frontend-api\.clerk\.(?:services|dev)/i, proxyUrl);
    responseHeaders.set("location", rewritten);
  }
  responseHeaders.delete("content-length");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
