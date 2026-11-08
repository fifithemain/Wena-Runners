"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

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
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const runnerDetails = useRef<{ idNumber: string; idDocument: File | null; selfie: File | null }>({
    idNumber: "",
    idDocument: null,
    selfie: null,
  });

  async function finishRunnerRegistration() {
    const profileResponse = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow: "signup" }),
      cache: "no-store",
    });
    const profileResult: { profile?: { role?: string }; error?: string } = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok || !profileResult.profile) {
      throw new Error(profileResult.error || "We couldn't finish setting up your account.");
    }
    if (!["runner", "both"].includes(profileResult.profile.role || "")) return;

    const { idNumber, idDocument, selfie } = runnerDetails.current;
    if (!idNumber || !idDocument || !selfie) {
      throw new Error("Runner registration needs your ID number, ID photo, and selfie. Please return to signup and add them.");
    }
    for (const [documentType, file] of [["idDocument", idDocument], ["selfie", selfie]] as const) {
      const form = new FormData();
      form.set("documentType", documentType);
      form.set("file", file);
      if (documentType === "idDocument") form.set("idNumber", idNumber);
      const uploadResponse = await fetch("/api/runner-verification", { method: "POST", body: form });
      const uploadResult: { error?: string } = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadResult.error || `We couldn't upload your ${documentType === "idDocument" ? "ID photo" : "selfie"}.`);
    }
  }

  async function activateSession(attempt = signUp) {
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await setActive({ session: attempt.createdSessionId });
      setVerificationComplete(true);
      setNeedsVerification(true);
      await finishRunnerRegistration();
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
    if (details.role !== "customer") {
      const idDocument = data.get("idDocument");
      const selfie = data.get("selfie");
      runnerDetails.current = {
        idNumber: String(data.get("idNumber") || "").trim(),
        idDocument: idDocument instanceof File && idDocument.size ? idDocument : null,
        selfie: selfie instanceof File && selfie.size ? selfie : null,
      };
      if (!runnerDetails.current.idNumber || !runnerDetails.current.idDocument || !runnerDetails.current.selfie) {
        setError("Enter your ID number and choose both an ID photo and a selfie.");
        setBusy(false);
        return;
      }
    }
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

  async function handleFinishRegistration() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await finishRunnerRegistration();
      router.replace("/auth/complete?flow=signup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't finish your registration. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (needsVerification) {
    if (verificationComplete) {
      return (
        <div>
          <p className="muted">Your email is verified. Finish setting up your WENA account and Runner documents.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="button" onClick={handleFinishRegistration} disabled={busy}>
            {busy ? "Finishing registration…" : "Finish registration"}
          </button>
        </div>
      );
    }
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
        <>
          <div className="field">
            <label htmlFor="zone">Runner area / zone</label>
            <input id="zone" name="zone" required maxLength={120} autoComplete="address-level2" />
          </div>
          <div className="field">
            <label htmlFor="idNumber">South African ID number</label>
            <input id="idNumber" name="idNumber" required maxLength={32} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="idDocument">Photo of your ID document</label>
            <input id="idDocument" name="idDocument" type="file" accept="image/jpeg,image/png,image/webp" required />
            <small className="small">JPEG, PNG, or WebP. Maximum 4 MB.</small>
          </div>
          <div className="field">
            <label htmlFor="selfie">Selfie</label>
            <input id="selfie" name="selfie" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required />
            <small className="small">Take a clear photo of yourself. JPEG, PNG, or WebP, up to 4 MB.</small>
          </div>
        </>
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
