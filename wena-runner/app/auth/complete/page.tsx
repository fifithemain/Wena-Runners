"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function CompleteAuth() {
  const router = useRouter();
  const search = useSearchParams();
  const flow = search.get("flow") === "signup" ? "signup" : "login";
  const requestInProgress = useRef(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const complete = useCallback(async () => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setChecking(true);
    setError("");
    let lastError = "No WENA profile was returned.";

    try {
      // Clerk's session cookie can settle just after verification completes.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** (attempt - 1)));
        }
        const response = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flow }),
          cache: "no-store",
        });
        const result: { profile?: unknown; error?: unknown } = await response.json().catch(() => ({}));
        if (response.ok && result.profile) {
          router.replace("/jobs");
          return;
        }
        lastError =
          typeof result.error === "string"
            ? result.error
            : `Profile check failed (${response.status}).`;
        if (response.status !== 401) break;
      }
      setError(
        `We couldn't finish linking your WENA profile. Your Clerk session is still active. Details: ${lastError}`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn't verify your WENA profile. Please try again.",
      );
    } finally {
      requestInProgress.current = false;
      setChecking(false);
    }
  }, [flow, router]);

  useEffect(() => {
    void complete();
  }, [complete]);

  return (
    <main className="formwrap">
      <section className="panel account-check-panel">
        <h1>{checking ? "Finding your WENA account" : "Account check needs attention"}</h1>
        {checking ? (
          <div className="account-check-status" role="status" aria-live="polite">
            <svg className="account-check-route" viewBox="0 0 240 64" aria-hidden="true">
              <path
                className="account-check-route-base"
                d="M18 42 C56 42 58 14 98 14 S138 50 176 50 S198 28 222 28"
              />
              <path
                className="account-check-route-trail"
                d="M18 42 C56 42 58 14 98 14 S138 50 176 50 S198 28 222 28"
              />
              <circle className="account-check-stop" cx="18" cy="42" r="4" />
              <circle className="account-check-stop" cx="98" cy="14" r="4" />
              <circle className="account-check-stop" cx="176" cy="50" r="4" />
              <g className="account-check-runner">
                <circle cx="0" cy="0" r="9" />
                <path d="M-3 1 0 4 5-4" />
              </g>
            </svg>
            <p className="account-check-title">Matching your verified email</p>
            <p className="muted">
              We’re securely checking for your existing WENA profile.
            </p>
          </div>
        ) : (
          <>
            <p className="error" role="alert">{error}</p>
            <button className="btn" type="button" onClick={() => void complete()}>
              Try again
            </button>
            <Link className="account-check-back" href="/login">
              Return to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="formwrap">
          <section className="panel account-check-panel">
            <h1>Finding your WENA account</h1>
            <p className="muted">Loading your secure account check…</p>
          </section>
        </main>
      }
    >
      <CompleteAuth />
    </Suspense>
  );
}
