import crypto from "crypto";

const SECRET = () => process.env.SESSION_SECRET || "dev-secret-change-me";

// Creates a signed token: "<runnerId>.<signature>"
export function signSession(runnerId: string) {
  const sig = crypto
    .createHmac("sha256", SECRET())
    .update(runnerId)
    .digest("hex");
  return `${runnerId}.${sig}`;
}

export function verifySession(token: string | undefined | null) {
  if (!token) return null;
  const [runnerId, sig] = token.split(".");
  if (!runnerId || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SECRET())
    .update(runnerId)
    .digest("hex");
  const valid =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return valid ? runnerId : null;
}

export function isAdmin(req: Request) {
  const password = req.headers.get("x-admin-password");
  return !!password && password === process.env.ADMIN_PASSWORD;
}
