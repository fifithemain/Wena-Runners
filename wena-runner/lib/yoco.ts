import crypto from "crypto";

const YOCO_API = "https://payments.yoco.com/api";

export async function createYocoCheckout(opts: {
  amountRand: number;
  jobId: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
}) {
  const secretKey = process.env.YOCO_SECRET_KEY;
  if (!secretKey) throw new Error("YOCO_SECRET_KEY is not set");

  const res = await fetch(`${YOCO_API}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(opts.amountRand * 100), // Yoco amounts are in cents
      currency: "ZAR",
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
      failureUrl: opts.failureUrl,
      metadata: { jobId: opts.jobId },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Yoco checkout could not be created");
  }
  return data as { id: string; redirectUrl: string };
}

// Yoco uses the Standard Webhooks scheme: headers webhook-id, webhook-timestamp,
// webhook-signature. Secret is "whsec_<base64>". See:
// https://developer.yoco.com/online/api-reference/webhooks/verifying-events
export function verifyYocoWebhook(opts: {
  webhookId: string;
  webhookTimestamp: string;
  signatureHeader: string; // e.g. "v1,abc123 v1,def456"
  rawBody: string;
}) {
  const secretEnv = process.env.YOCO_WEBHOOK_SECRET;
  if (!secretEnv) throw new Error("YOCO_WEBHOOK_SECRET is not set");

  // Reject stale events (>3 min old) to reduce replay risk.
  const tsSeconds = Number(opts.webhookTimestamp);
  if (!tsSeconds || Math.abs(Date.now() / 1000 - tsSeconds) > 180) {
    return false;
  }

  const secretBytes = Buffer.from(secretEnv.replace(/^whsec_/, ""), "base64");
  const signedContent = `${opts.webhookId}.${opts.webhookTimestamp}.${opts.rawBody}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const candidates = opts.signatureHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean) as string[];

  return candidates.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}
