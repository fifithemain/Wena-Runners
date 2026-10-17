"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ProfileDetails = {
  fullName: string;
  phone: string;
  role: "customer" | "runner" | "both";
  zone: string;
};

export default function SignupForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [role, setRole] = useState<ProfileDetails["role"]>("customer");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activateSession(attempt = signUp) {
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await setActive({ session: attempt.createdSessionId });
      router.replace("/auth/complete?flow=signup");
      return true;
    }

    const missing = attempt.missingFields.map((field) =>
      field.replaceAll("_", " "),
    );
    const unverified = attempt.unverifiedFields.map((field) =>
      field.replaceAll("_", " "),
    );
    if (missing.length || unverified.length) {
      const requirements = [
        missing.length ? `Still required: ${missing.join(", ")}.` : "",
        unverified.length ? `Still needs verification: ${unverified.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      setError(`Your email is verified, but Clerk needs more information. ${requirements}`);
    } else {
      setError("Your email is verified, but Clerk did not create an active session. Please try signing in.");
    }
    return false;
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const details: ProfileDetails = {
      fullName: String(data.get("fullName") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      role: String(data.get("role") || "customer") as ProfileDetails["role"],
      zone: String(data.get("zone") || "").trim(),
    };
    const email = String(data.get("emailAddress") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    try {
      const nameParts = details.fullName.split(/\s+/);
      const attempt = await signUp.create({
        emailAddress: email,
        password,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || undefined,
        unsafeMetadata: details,
      });
      setEmailAddress(email);

      if (await activateSession(attempt)) return;

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setNeedsVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });
      await activateSession(attempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That verification code couldn't be confirmed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (needsVerification) {
    return (
      <form onSubmit={handleVerification}>
        <p className="muted">We sent a verification code to <strong>{emailAddress}</strong>. Enter it below to finish creating your WENA account.</p>
        <div className="field">
          <label htmlFor="verificationCode">Email verification code</label>
          <input
            id="verificationCode"
            name="verificationCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            required
            maxLength={10}
          />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !isLoaded}>
          {busy ? "Verifying…" : "Verify email and create account"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignup}>
      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" required maxLength={120} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="role">Account type</label>
        <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value as ProfileDetails["role"])}>
          <option value="customer">Request errands</option>
          <option value="runner">Become a Runner</option>
          <option value="both">Both</option>
        </select>
      </div>
      {role !== "customer" && (
        <div className="field">
          <label htmlFor="zone">Runner area / zone</label>
          <input id="zone" name="zone" required maxLength={120} autoComplete="address-level2" />
        </div>
      )}
      <div className="field">
        <label htmlFor="emailAddress">Email address</label>
        <input id="emailAddress" name="emailAddress" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Create password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !isLoaded}>
        {busy ? "Creating account…" : "Create WENA account"}
      </button>
      <p className="muted" style={{ marginTop: 12 }}>You’ll verify your email before entering WENA Runners.</p>
    </form>
  );
}
