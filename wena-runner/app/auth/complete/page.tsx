"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function CompleteAuth() {
  const router = useRouter();
  const search = useSearchParams();
  const [message, setMessage] = useState("Checking your WENA account…");
  const [checking, setChecking] = useState(false);

  const complete = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setMessage("Checking your WENA account…");
    const flow = search.get("flow") === "signup" ? "signup" : "login";
    let lastError = "No WENA profile was returned.";

    try {
      // Clerk session activation and the server-side session cookie can settle
      // just after the verification form completes. Retry before showing failure.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
        const response = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flow }),
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.profile) {
          router.replace("/jobs");
          return;
        }
        lastError = typeof result.error === "string" ? result.error : `Profile check failed (${response.status}).`;
      }
      setMessage(`We couldn't finish linking your WENA profile. Your Clerk session has been kept active. Details: ${lastError}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't verify your WENA profile. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [checking, router, search]);

  useEffect(() => {
    void complete();
    // Run once on page entry; retry button calls the same action if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="formwrap">
      <section className="panel">
        <h1>Checking your account</h1>
        <p className="muted">{message}</p>
        {message !== "Checking your WENA account…" && (
          <button className="btn" type="button" onClick={() => void complete()} disabled={checking}>
            {checking ? "Checking…" : "Try again"}
          </button>
        )}
      </section>
    </main>
  );
}

export default function AuthCompletePage() {
  return <Suspense fallback={<main className="formwrap"><section className="panel">Checking your WENA account…</section></main>}><CompleteAuth /></Suspense>;
}
