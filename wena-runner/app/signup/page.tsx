"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";

export default function Signup() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [zone, setZone] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishSignUp(sessionId?: string | null) {
    if (!sessionId) throw new Error("Clerk did not create a session. Please sign in after verification.");
    await setActive({ session: sessionId });
    const response = await fetch("/api/auth/profile", { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Your account was created, but WENA could not prepare your profile.");
    }
    window.location.href = "/jobs";
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setBusy(true);
    setError("");
    try {
      if (verifying) {
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status !== "complete") throw new Error("Email verification is not complete yet.");
        await finishSignUp(result.createdSessionId);
        return;
      }
      if (role !== "customer" && !zone.trim()) throw new Error("Enter your Runner area / zone.");
      const nameParts = name.trim().split(/\s+/);
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" "),
        unsafeMetadata: { full_name: name.trim(), phone: phone.trim(), role, zone: zone.trim() }
      });
      if (result.status === "complete") {
        await finishSignUp(result.createdSessionId);
        return;
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="formwrap">
    <Link href="/" className="brand">WENA <span>RUNNERS</span></Link>
    <form className="panel" style={{ marginTop: 24 }} onSubmit={go}>
      <h1>{verifying ? "Verify your email." : "Create your account."}</h1>
      <p className="muted">{verifying ? "Clerk has sent a verification code to your email address." : "Clerk securely manages your account and email verification."}</p>
      {!verifying ? <>
        <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="phone">Phone</label><input id="phone" required autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password (8+ characters)</label><input id="password" required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className="field"><label htmlFor="role">Account type</label><select id="role" value={role} onChange={e => setRole(e.target.value)}><option value="customer">Request errands</option><option value="runner">Become a Runner</option><option value="both">Both</option></select></div>
        {role !== "customer" && <div className="field"><label htmlFor="zone">Runner area / zone</label><input id="zone" required value={zone} onChange={e => setZone(e.target.value)} /></div>}
      </> : <div className="field"><label htmlFor="code">Email verification code</label><input id="code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} /></div>}
      {error && <p className="error">{error}</p>}
      <button className="btn" style={{ width: "100%" }} disabled={!isLoaded || busy}>{busy ? "Please wait…" : verifying ? "Verify email and continue" : "Create account"}</button>
      {!verifying && <p className="small">Already registered? <Link href="/login">Sign in</Link></p>}
    </form>
  </main>;
}
