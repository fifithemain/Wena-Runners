"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

export default function Login() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Clerk requires an additional verification step. Complete it in Clerk, then try again.");
      }
      await setActive({ session: result.createdSessionId });
      const sync = await fetch("/api/auth/profile", { method: "POST" });
      if (!sync.ok) {
        const data = await sync.json().catch(() => ({}));
        throw new Error(data.error || "Your sign-in succeeded, but WENA could not prepare your profile.");
      }
      window.location.href = "/jobs";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="formwrap">
    <Link href="/" className="brand">WENA <span>RUNNERS</span></Link>
    <form className="panel" style={{ marginTop: 24 }} onSubmit={go}>
      <h1>Welcome back.</h1>
      <p className="muted">Sign in securely with Clerk to manage errands or Runner work.</p>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p className="error">{error}</p>}
      <button className="btn" style={{ width: "100%" }} disabled={!isLoaded || busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="small">New to WENA? <Link href="/signup">Create an account</Link></p>
    </form>
  </main>;
}
